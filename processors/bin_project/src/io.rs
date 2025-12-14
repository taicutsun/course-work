use std::fs::OpenOptions;
use std::io::{self, Write};
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use num_bigint::BigUint;
use rand::{RngCore};
use rand::rngs::StdRng;

#[derive(Clone, Copy)]
pub enum Scenario {
    SingleCore,
    MultiCore,
    IGpu,
}

impl Scenario {
    pub fn label(&self) -> &'static str {
        match self {
            Scenario::SingleCore => "single",
            Scenario::MultiCore => "multi",
            Scenario::IGpu => "igpu",
        }
    }
}

pub fn env_name() -> String {
    let arch = std::env::consts::ARCH;
    match arch {
        "aarch64" => "mac".to_string(),
        "x86_64" => "intel".to_string(),
        _ => arch.to_string(),
    }
}

pub fn result_filename(scenario: Scenario) -> String {
    let env = env_name();
    format!("res-{}-{}.csv", env, scenario.label())
}

/// Write CSV row with the normalized schema.
pub fn append_result_row(scenario: Scenario, elapsed_ns: u128, operations: u64, axis_seconds: Option<f64>) {
    let filename = result_filename(scenario);

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&filename)
        .unwrap();

    if file.metadata().unwrap().len() == 0 {
        writeln!(
            file,
            "timestamp,elapsed_seconds,operations,operations_per_second"
        )
        .unwrap();
    }

    // Use cumulative time for graph-friendly data
    let elapsed_seconds = axis_seconds.unwrap_or((elapsed_ns as f64) / 1e9f64);
    let ops_per_sec = if elapsed_seconds > 0.0 {
        operations as f64 / elapsed_seconds
    } else {
        0.0
    };
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_else(|_| Duration::from_secs(0))
        .as_secs_f64();

    writeln!(
        file,
        "{:.6},{:.6},{},{:.2}",
        ts, elapsed_seconds, operations, ops_per_sec
    )
    .unwrap();
}

pub fn read_line_trimmed(prompt: &str) -> io::Result<String> {
    let mut input = String::new();
    print!("{}", prompt);
    io::stdout().flush()?;
    io::stdin().read_line(&mut input)?;
    Ok(input.trim().to_string())
}

pub fn read_u128(prompt: &str) -> u128 {
    loop {
        match read_line_trimmed(prompt) {
            Ok(s) => match s.parse::<u128>() {
                Ok(v) => return v,
                Err(_) => println!("Invalid number, please enter a non-negative integer."),
            },
            Err(e) => {
                eprintln!("I/O error: {}", e);
                std::process::exit(1);
            }
        }
    }
}

pub fn read_optional_u128(prompt: &str) -> Option<u128> {
    loop {
        match read_line_trimmed(prompt) {
            Ok(s) => {
                if s.is_empty() {
                    return None;
                }
                match s.parse::<u128>() {
                    Ok(v) => return Some(v),
                    Err(_) => println!("Invalid number, please enter a non-negative integer or leave empty."),
                }
            }
            Err(e) => {
                eprintln!("I/O error: {}", e);
                std::process::exit(1);
            }
        }
    }
}

/// Run a blocking computation while showing a small spinner to indicate progress.
/// Returns the closure result. Spinner prints once per 300ms until computation finishes.
pub fn run_with_spinner<F, R>(label: &str, f: F) -> R
where
    F: FnOnce() -> R,
{
    let done = Arc::new(AtomicBool::new(false));
    let d = done.clone();
    // spinner: use owned label for the thread to avoid lifetime issues
    let label_owned = label.to_string();
    print!("{}", label_owned);
    io::stdout().flush().ok();
    let handle = thread::spawn(move || {
        let mut count = 0usize;
        while !d.load(Ordering::Relaxed) {
            if count < 10 {
                print!(".");
                count += 1;
            } else {
                // reset the line: carriage return + label again
                print!("\r{}", label_owned);
                // clear following characters by printing spaces then carriage return+label
                print!("          \r{}", label_owned);
                count = 0;
            }
            io::stdout().flush().ok();
            thread::sleep(Duration::from_millis(300));
        }
    });

    let res = f();
    done.store(true, Ordering::Relaxed);
    let _ = handle.join();
    println!("");
    res
}

pub fn gen_random_u128(rng: &mut StdRng, bits: usize) -> u128 {
    let bits = bits.min(128).max(1);
    let v: u128 = if bits == 128 {
        let hi = rng.next_u64() as u128;
        let lo = rng.next_u64() as u128;
        (hi << 64) | lo
    } else {
        let mut x: u128 = 0;
        let mut remaining = bits;
        while remaining > 0 {
            let take = remaining.min(64);
            let part = rng.next_u64() as u128 & ((1u128 << take) - 1);
            x = (x << take) | part;
            remaining -= take;
        }
        x
    };
    // ensure non-zero
    if v == 0 { 1 } else { v }
}

pub fn gen_random_biguint(rng: &mut StdRng, bits: usize) -> BigUint {
    let bits = bits.max(1);
    let bytes = (bits + 7) / 8;
    let mut buf = vec![0u8; bytes];
    for b in &mut buf { *b = (rng.next_u64() & 0xFF) as u8; }
    // set high bit to ensure size
    let highest_bit = (bits - 1) % 8;
    buf[0] |= 1u8 << highest_bit;
    BigUint::from_bytes_be(&buf)
}
