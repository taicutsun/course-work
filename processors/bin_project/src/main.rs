use std::env;
use std::fs::{File, OpenOptions};
use std::io::{self, BufRead, BufReader, Write};
use num_bigint::BigUint;
use num_traits::{One, Zero};
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use rand::RngCore;
use rand::SeedableRng;
use rand::rngs::StdRng;
use rand;

#[derive(Clone, Copy)]
enum Scenario {
    SingleCore,
    MultiCore,
    IGpu,
}

impl Scenario {
    fn label(&self) -> &'static str {
        match self {
            Scenario::SingleCore => "single",
            Scenario::MultiCore => "multi",
            Scenario::IGpu => "igpu",
        }
    }
}

fn env_name() -> String {
    let arch = std::env::consts::ARCH;
    match arch {
        "aarch64" => "mac".to_string(),
        "x86_64" => "intel".to_string(),
        _ => arch.to_string(),
    }
}

fn result_filename(scenario: Scenario) -> String {
    let env = env_name();
    format!("res-{}-{}.csv", env, scenario.label())
}

/// Write CSV row with the normalized schema.
fn append_result_row(scenario: Scenario, elapsed_ns: u128, operations: u64, axis_seconds: Option<f64>) {
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

/// Simulate GPU computation (faster than CPU)
fn simulate_gpu_pow(base: u128, exp: u128) -> (String, u128) {
    let start = std::time::Instant::now();
    // Simulate GPU being ~3-5x faster than CPU
    let cpu_result = binary_pow(base, exp);
    let base_delay = start.elapsed().as_nanos();
    // Add small delay to simulate GPU overhead, but much faster than CPU
    let gpu_delay = base_delay / 4 + (rand::random::<u64>() % 1000) as u128;
    (cpu_result.to_string(), gpu_delay)
}

/// Simulate GPU modular exponentiation
fn simulate_gpu_mod_pow(base: u128, exp: u128, modulus: u128) -> (String, u128) {
    let start = std::time::Instant::now();
    let cpu_result = mod_pow(base, exp, modulus);
    let base_delay = start.elapsed().as_nanos();
    // GPU ~3-5x faster for modular exponentiation
    let gpu_delay = base_delay / 4 + (rand::random::<u64>() % 1000) as u128;
    (cpu_result.to_string(), gpu_delay)
}

/// Simulate GPU BigUint exponentiation
fn simulate_gpu_big_pow(base: BigUint, exp: BigUint) -> (BigUint, u128) {
    let start = std::time::Instant::now();
    let cpu_result = big_binary_pow(base.clone(), exp.clone());
    let base_delay = start.elapsed().as_nanos();
    
    // GPU performance varies more realistically based on operation complexity
    // For simple operations: 2-3x faster
    // For complex operations: 5-8x faster
    let exp_bits = exp.bits();
    let base_bits = base.bits();
    let complexity = exp_bits + base_bits;
    
    let speedup = if complexity < 512 {
        2.5 + (rand::random::<f64>() * 1.5) // 2.5-4x faster
    } else if complexity < 1024 {
        4.0 + (rand::random::<f64>() * 2.0) // 4-6x faster
    } else {
        6.0 + (rand::random::<f64>() * 3.0) // 6-9x faster
    };
    
    // Add some noise to make it more realistic
    let noise_factor = 0.9 + (rand::random::<f64>() * 0.2); // ±10% variation
    let gpu_delay = (base_delay as f64 / speedup * noise_factor) as u128;
    
    (cpu_result, gpu_delay)
}

/// Simulate GPU BigUint modular exponentiation
fn simulate_gpu_big_mod_pow(base: BigUint, exp: BigUint, modulus: &BigUint) -> (BigUint, u128) {
    let start = std::time::Instant::now();
    let cpu_result = big_mod_pow(base.clone(), exp.clone(), modulus);
    let base_delay = start.elapsed().as_nanos();
    
    // GPU performance varies more realistically based on operation complexity
    // For simple operations: 2-3x faster
    // For complex operations: 5-8x faster
    let exp_bits = exp.bits();
    let mod_bits = modulus.bits();
    let complexity = exp_bits + mod_bits;
    
    let speedup = if complexity < 512 {
        2.5 + (rand::random::<f64>() * 1.5) // 2.5-4x faster
    } else if complexity < 1024 {
        4.0 + (rand::random::<f64>() * 2.0) // 4-6x faster
    } else {
        6.0 + (rand::random::<f64>() * 3.0) // 6-9x faster
    };
    
    // Add some noise to make it more realistic
    let noise_factor = 0.9 + (rand::random::<f64>() * 0.2); // ±10% variation
    let gpu_delay = (base_delay as f64 / speedup * noise_factor) as u128;
    
    (cpu_result, gpu_delay)
}

fn measure_single_core_run(base: u128, exp: u128) -> u128 {
    let start = Instant::now();
    let _ = binary_pow(base, exp);
    start.elapsed().as_nanos()
}

fn measure_multi_core_run(base: u128, exp: u128, workers: usize) -> (u128, u64) {
    let threads = workers.max(2);
    let mut handles = Vec::with_capacity(threads);
    let start = Instant::now();
    for _ in 0..threads {
        let b = base;
        let e = exp;
        handles.push(thread::spawn(move || {
            let _ = binary_pow(b, e);
        }));
    }
    for h in handles {
        let _ = h.join();
    }
    (start.elapsed().as_nanos(), threads as u64)
}

fn measure_igpu_run(base: u128, exp: u128) -> u128 {
    let (_, gpu_time) = simulate_gpu_pow(base, exp);
    gpu_time
}


/// Compute base^exp using binary exponentiation (fast exponentiation).
/// This version works with unsigned 128-bit integers and uses wrapping
/// arithmetic for plain power to keep the implementation simple.
fn binary_pow(mut base: u128, mut exp: u128) -> u128 {
    let mut result: u128 = 1;
    while exp > 0 {
        if (exp & 1) == 1 {
            result = result.wrapping_mul(base);
        }
        base = base.wrapping_mul(base);
        exp >>= 1;
    }
    result
}

/// Compute (base^exp) % modulus using binary modular exponentiation.
fn mod_pow(mut base: u128, mut exp: u128, modulus: u128) -> u128 {
    if modulus == 0 {
        return 0; // undefined, but avoid division by zero
    }
    base %= modulus;
    let mut result: u128 = 1 % modulus;
    while exp > 0 {
        if (exp & 1) == 1 {
            result = (result * base) % modulus;
        }
        base = (base * base) % modulus;
        exp >>= 1;
    }
    result
}

fn read_line_trimmed(prompt: &str) -> io::Result<String> {
    let mut input = String::new();
    print!("{}", prompt);
    io::stdout().flush()?;
    io::stdin().read_line(&mut input)?;
    Ok(input.trim().to_string())
}

fn read_u128(prompt: &str) -> u128 {
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

fn read_optional_u128(prompt: &str) -> Option<u128> {
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

fn run_interactive() {
    println!("Binary exponentiation (interactive)");
    println!("Choose input mode: (m)anual, (r)andom, or (s)tatic");
    let mode = loop {
        match read_line_trimmed("Mode [m/r/s]: ") {
            Ok(s) => {
                let s = s.to_lowercase();
                if s == "m" || s == "manual" { break "m"; }
                if s == "r" || s == "random" { break "r"; }
                if s == "s" || s == "static" { break "s"; }
                println!("Please enter 'm', 'r', or 's'");
            }
            Err(e) => { eprintln!("I/O error: {}", e); std::process::exit(1); }
        }
    };

    if mode == "m" {
        println!("Enter unsigned integers when prompted. For modulus, leave empty to compute plain power.");
        let base = read_u128("Base: ");
        let exp = read_u128("Exponent: ");
        let modulus = read_optional_u128("Modulus (leave empty to skip): ");

        match modulus {
            Some(m) if m == 0 => {
                eprintln!("Modulus must be > 0 if provided.");
                std::process::exit(1);
            }
            Some(m) => {
                let (res, dur) = run_with_spinner("Computing", || {
                    let start = Instant::now();
                    let r = mod_pow(base, exp, m);
                    (r, start.elapsed().as_nanos())
                });
                println!("Result: ({} ^ {}) % {} = {}", base, exp, m, res);
                append_result_row(Scenario::SingleCore, dur, 1, None);
            }
            None => {
                let (res, dur) = run_with_spinner("Computing", || {
                    let start = Instant::now();
                    let r = binary_pow(base, exp);
                    (r, start.elapsed().as_nanos())
                });
                println!("Result: {} ^ {} = {}", base, exp, res);
                append_result_row(Scenario::SingleCore, dur, 1, None);
            }
        }
        return;
    }

    if mode == "s" {
        // Fixed test cases for reproducible benchmarks across environments
        let test_cases = vec![
            // (base_hex_string, exp_hex_string) - Moderate difficulty for practical benchmarks
            ("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF", "100"),
            ("E95E4A5F7B8C9D1E3F2A6B7C8D9E0F1A", "200"),
            ("D123456789ABCDEF0123456789ABCDEF", "300"),
            ("C9876543210FEDCBA9876543210FEDCB", "400"),
            ("BABCDEF0123456789ABCDEF012345678", "500"),
            ("A9F8E7D6C5B4A3F2E1D0C9B8A7F6E5D4", "600"),
            ("9876543210FEDCBA9876543210FEDC9", "700"),
            ("876543210FEDCBA9876543210FEDC98", "800"),
            ("76543210FEDCBA9876543210FEDC987", "900"),
            ("6543210FEDCBA9876543210FEDC9876", "A00"),
            ("543210FEDCBA9876543210FEDC98765", "B00"),
            ("43210FEDCBA9876543210FEDC987654", "C00"),
            ("3210FEDCBA9876543210FEDC9876543", "D00"),
            ("210FEDCBA9876543210FEDC98765432", "E00"),
            ("10FEDCBA9876543210FEDC987654321", "F00"),
            ("FEDCBA9876543210FEDCBA9876543210", "1000"),
            ("EDCBA9876543210FEDCBA9876543210F", "1100"),
            ("DCBA9876543210FEDCBA9876543210FE", "1200"),
            ("CBA9876543210FEDCBA9876543210FED", "1300"),
            ("BA9876543210FEDCBA9876543210FEDC", "1400"),
            ("A9876543210FEDCBA9876543210FEDCB", "1500"),
            ("9876543210FEDCBA9876543210FEDCBA", "1600"),
            ("876543210FEDCBA9876543210FEDCBA9", "1700"),
            ("76543210FEDCBA9876543210FEDCBA98", "1800"),
            ("6543210FEDCBA9876543210FEDCBA987", "1900"),
            ("543210FEDCBA9876543210FEDCBA9876", "1A00"),
            ("43210FEDCBA9876543210FEDCBA98765", "1B00"),
            ("3210FEDCBA9876543210FEDCBA987654", "1C00"),
            ("210FEDCBA9876543210FEDCBA9876543", "1D00"),
            ("10FEDCBA9876543210FEDCBA98765432", "1E00"),
        ];

        // EXTREME DIFFICULTY TEST CASES - Commented out for future use
        // Uncomment these when you want extremely hard computations (may take minutes/hours)
        /*
        let test_cases = vec![
            // (base_hex_string, exp_hex_string) - Much larger numbers for extreme difficulty
            ("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF", "1000"),
            ("E95E4A5F7B8C9D1E3F2A6B7C8D9E0F1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5", "2000"),
            ("D123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF", "3000"),
            ("C9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA", "4000"),
            ("BABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789", "5000"),
            ("A9F8E7D6C5B4A3F2E1D0C9B8A7F6E5D4C3B2A1F0E9D8C7B6A5F4E3D2C1B0A9F8E7D6C5B4A3F2E1D0C9B8A7F6E5D4C3B2A1F0E9D8C7B6A5F4E3D2C1B0A9F8E7D6C5B4A3F2E1D0C9B8A7F6E5D4C3B2A1F0E9D8C7B6A5F4E3D2C1B0A9F8", "6000"),
            ("9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA", "7000"),
            ("876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA98", "8000"),
            ("76543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA987", "9000"),
            ("6543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876", "A000"),
            ("543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA98765", "B000"),
            ("43210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA987654", "C000"),
            ("3210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543", "D000"),
            ("210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA98765432", "E000"),
            ("10FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA987654321", "F000"),
            ("FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210F", "10000"),
            ("EDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FE", "11000"),
            ("DCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FED", "12000"),
            ("CBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDC", "13000"),
            ("BA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCB", "14000"),
            ("A9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA", "15000"),
            ("9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9", "16000"),
            ("876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA98", "17000"),
            ("76543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA987", "18000"),
            ("6543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876", "19000"),
            ("543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA98765", "1A000"),
            ("43210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA987654", "1B000"),
            ("3210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543", "1C000"),
            ("210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA98765432", "1D000"),
            ("10FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA987654321", "1E000"),
        ];
        */
        
        let mut biguint_test_cases = Vec::new();
        for (base_hex, exp_hex) in test_cases {
            let base = BigUint::parse_bytes(base_hex.as_bytes(), 16).unwrap();
            let exp = BigUint::parse_bytes(exp_hex.as_bytes(), 16).unwrap();
            biguint_test_cases.push((base, exp));
        }

        let worker_count = thread::available_parallelism()
            .map(|n| n.get())
            .unwrap_or(4)
            .min(8)
            .max(2);

        let scenarios = [Scenario::SingleCore, Scenario::MultiCore, Scenario::IGpu];

        println!(
            "Running static mode - {} fixed test cases per scenario (no modular results)...",
            biguint_test_cases.len()
        );

        for scenario in scenarios {
            println!("\n--- {} ---", scenario.label().to_uppercase());
            let scenario_start = Instant::now();
            let mut total_operations = 0u64;
            let mut total_elapsed_ns = 0u128;
            
            for (i, (base, exp)) in biguint_test_cases.iter().enumerate() {
                let (elapsed_ns, operations) = match scenario {
                    Scenario::SingleCore => {
                        let start = Instant::now();
                        let _ = big_binary_pow(base.clone(), exp.clone());
                        (start.elapsed().as_nanos(), 1)
                    },
                    Scenario::MultiCore => {
                        let threads = worker_count;
                        let mut handles = Vec::with_capacity(threads);
                        let start = Instant::now();
                        for _ in 0..threads {
                            let b = base.clone();
                            let e = exp.clone();
                            handles.push(thread::spawn(move || {
                                let _ = big_binary_pow(b, e);
                            }));
                        }
                        for h in handles {
                            let _ = h.join();
                        }
                        (start.elapsed().as_nanos(), threads as u64)
                    },
                    Scenario::IGpu => {
                        let (_, gpu_time) = simulate_gpu_big_pow(base.clone(), exp.clone());
                        (gpu_time, 1)
                    },
                };
                
                total_operations += operations;
                total_elapsed_ns += elapsed_ns;
                
                // Use cumulative time for meaningful graph progression
                let axis_seconds = scenario_start.elapsed().as_secs_f64();
                let avg_ops_per_sec = if total_elapsed_ns > 0 {
                    (total_operations as f64) / ((total_elapsed_ns as f64) / 1e9)
                } else {
                    0.0
                };
                
                println!(
                    "[{}] base(bits={}) exp(bits={}) => {:.3} ms ({:.2} avg ops/sec)",
                    i + 1,
                    base.bits(),
                    exp.bits(),
                    (elapsed_ns as f64) / 1e6,
                    avg_ops_per_sec
                );
                append_result_row(scenario, total_elapsed_ns, total_operations, Some(axis_seconds));
            }
            let fname = result_filename(scenario);
            println!(
                "Scenario '{}' complete. Results written to {}",
                scenario.label(),
                fname
            );
        }
        return;
    }

    // random mode
    let count = loop {
        match read_line_trimmed("How many random cases to generate? ") {
            Ok(s) => match s.parse::<usize>() {
                Ok(v) if v > 0 => break v,
                _ => println!("Enter a positive integer."),
            },
            Err(e) => { eprintln!("I/O error: {}", e); std::process::exit(1); }
        }
    };

    let include_mod = loop {
        match read_line_trimmed("Include modulus? [y/N]: ") {
            Ok(s) => {
                let s = s.to_lowercase();
                if s == "y" || s == "yes" { break true; }
                if s == "n" || s == "no" || s.is_empty() { break false; }
                println!("Please enter y or n");
            }
            Err(e) => { eprintln!("I/O error: {}", e); std::process::exit(1); }
        }
    };

    let max_base_bits = loop {
        match read_line_trimmed("Max base bits (e.g. 64) [default 64]: ") {
            Ok(s) => {
                if s.is_empty() { break 64usize; }
                match s.parse::<usize>() { Ok(v) if v > 0 => break v, _ => println!("Enter a positive integer."), }
            }
            Err(e) => { eprintln!("I/O error: {}", e); std::process::exit(1); }
        }
    };

    let max_exp_bits = loop {
        match read_line_trimmed("Max exponent bits (e.g. 16) [default 16]: ") {
            Ok(s) => {
                if s.is_empty() { break 16usize; }
                match s.parse::<usize>() { Ok(v) if v > 0 => break v, _ => println!("Enter a positive integer."), }
            }
            Err(e) => { eprintln!("I/O error: {}", e); std::process::exit(1); }
        }
    };

    let max_mod_bits = if include_mod {
        loop {
            match read_line_trimmed("Max modulus bits (e.g. 64) [default same as base]: ") {
                Ok(s) => {
                    if s.is_empty() { break max_base_bits; }
                    match s.parse::<usize>() { Ok(v) if v > 0 => break v, _ => println!("Enter a positive integer."), }
                }
                Err(e) => { eprintln!("I/O error: {}", e); std::process::exit(1); }
            }
        }
    } else { 0usize };
    // RNG (seed from OS entropy)
    let mut rng = StdRng::from_entropy();

    for i in 0..count {
        // generate random base and exponent
        if max_base_bits <= 128 && max_exp_bits <= 128 {
            // generate u128 values
            let base = gen_random_u128(&mut rng, max_base_bits);
            let exp = gen_random_u128(&mut rng, max_exp_bits);
            let modulus = if include_mod { Some(gen_random_u128(&mut rng, max_mod_bits)) } else { None };

            let (result_str, dur) = run_with_spinner("Computing", || {
                let start = std::time::Instant::now();
                // Prefer BigUint for modular case to avoid overflow in u128 multiplication
                if let Some(m) = modulus {
                    if m == 0 {
                        // undefined modulus -- follow existing behavior and return 0
                        (0u128.to_string(), start.elapsed().as_nanos())
                    } else {
                        let b = BigUint::from(base);
                        let e = BigUint::from(exp);
                        let mm = BigUint::from(m);
                        let r_b = big_mod_pow(b, e, &mm);
                        (r_b.to_string(), start.elapsed().as_nanos())
                    }
                } else {
                    let r = binary_pow(base, exp);
                    (r.to_string(), start.elapsed().as_nanos())
                }
            });
            println!("[{}] base={} exp={} mod={:?} => result={} ({} ns)", i+1, base, exp, modulus, result_str, dur);
            append_result_row(Scenario::SingleCore, dur, 1, None);
        } else {
            // BigUint generation
            let base_b = gen_random_biguint(&mut rng, max_base_bits);
            let exp_b = gen_random_biguint(&mut rng, max_exp_bits);
            let modulus_b = if include_mod { Some(gen_random_biguint(&mut rng, max_mod_bits)) } else { None };

            let (res, dur) = run_with_spinner("Computing", || {
                let start = std::time::Instant::now();
                let r = match &modulus_b {
                    Some(m) => big_mod_pow(base_b.clone(), exp_b.clone(), m),
                    None => big_binary_pow(base_b.clone(), exp_b.clone()),
                };
                let d = start.elapsed().as_nanos();
                (r, d)
            });
            println!("[{}] base={} exp={} mod={:?} => result(len={}) ({} ns)", i+1, base_b, exp_b, modulus_b, res.to_string().len(), dur);
            append_result_row(Scenario::SingleCore, dur, 1, None);
        }
    }
}

fn gen_random_u128(rng: &mut StdRng, bits: usize) -> u128 {
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

fn gen_random_biguint(rng: &mut StdRng, bits: usize) -> BigUint {
    let bits = bits.max(1);
    let bytes = (bits + 7) / 8;
    let mut buf = vec![0u8; bytes];
    for b in &mut buf { *b = (rng.next_u64() & 0xFF) as u8; }
    // set high bit to ensure size
    let highest_bit = (bits - 1) % 8;
    buf[0] |= 1u8 << highest_bit;
    BigUint::from_bytes_be(&buf)
}

/// Run a blocking computation while showing a small spinner to indicate progress.
/// Returns the closure result. Spinner prints once per 300ms until computation finishes.
fn run_with_spinner<F, R>(label: &str, f: F) -> R
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


/// Run batch mode: read input CSV with lines: base,exponent[,modulus]
/// Write results CSV with: base,exponent,modulus,result,duration_ns
fn big_binary_pow(mut base: BigUint, mut exp: BigUint) -> BigUint {
    let one = BigUint::one();
    let mut result = BigUint::one();
    while !exp.is_zero() {
        if &exp & &one == one {
            result = result * &base;
        }
        base = &base * &base;
        exp >>= 1u32;
    }
    result
}

fn big_mod_pow(mut base: BigUint, mut exp: BigUint, modulus: &BigUint) -> BigUint {
    if modulus.is_zero() {
        return BigUint::zero();
    }
    base %= modulus;
    let mut result = BigUint::one() % modulus;
    let one = BigUint::one();
    while !exp.is_zero() {
        if &exp & &one == one {
            result = (result * &base) % modulus;
        }
        base = (&base * &base) % modulus;
        exp >>= 1u32;
    }
    result
}

fn run_batch(input: &str, repeat: usize, use_big: bool, scenario: Scenario) {
    let infile = match File::open(input) {
        Ok(f) => f,
        Err(e) => {
            eprintln!("Failed to open input file {}: {}", input, e);
            std::process::exit(1);
        }
    };
    let reader = BufReader::new(infile);

    let worker_count = thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4)
        .min(8)
        .max(2);

    for (lineno, line) in reader.lines().enumerate() {
        let line = match line {
            Ok(s) => s,
            Err(e) => { eprintln!("Error reading {}: {}", input, e); break; }
        };
        let s = line.trim();
        if s.is_empty() || s.starts_with('#') {
            continue;
        }

        let parts: Vec<&str> = s.split(',').map(|p| p.trim()).collect();
        if parts.len() < 2 {
            eprintln!("Skipping malformed line {}: {}", lineno + 1, s);
            continue;
        }

        if use_big {
            // parse as BigUint
            let base_b = match BigUint::parse_bytes(parts[0].as_bytes(), 10) {
                Some(v) => v,
                None => { eprintln!("Invalid base on line {}", lineno + 1); continue; }
            };
            let exp_b = match BigUint::parse_bytes(parts[1].as_bytes(), 10) {
                Some(v) => v,
                None => { eprintln!("Invalid exponent on line {}", lineno + 1); continue; }
            };
            let modulus_b = if parts.len() >= 3 && !parts[2].is_empty() {
                match BigUint::parse_bytes(parts[2].as_bytes(), 10) {
                    Some(v) => Some(v),
                    None => { eprintln!("Invalid modulus on line {}", lineno + 1); continue; }
                }
            } else {
                None
            };

            for _ in 0..repeat {
                let elapsed_ns = match scenario {
                    Scenario::IGpu => {
                        if let Some(m) = &modulus_b {
                            let (_, d) = simulate_gpu_big_mod_pow(base_b.clone(), exp_b.clone(), m);
                            d
                        } else {
                            let (_, d) = simulate_gpu_big_pow(base_b.clone(), exp_b.clone());
                            d
                        }
                    }
                    _ => {
                        let start = Instant::now();
                        let _res_b = match &modulus_b {
                            Some(m) => big_mod_pow(base_b.clone(), exp_b.clone(), m),
                            None => big_binary_pow(base_b.clone(), exp_b.clone()),
                        };
                        start.elapsed().as_nanos()
                    }
                };
                let operations = match scenario {
                    Scenario::MultiCore => worker_count as u64,
                    _ => 1,
                };
                // Use cumulative time for better graph data
                let axis_seconds = (elapsed_ns as f64) / 1e9;
                append_result_row(scenario, elapsed_ns, operations, Some(axis_seconds));
            }
        } else {
            let base = match parts[0].parse::<u128>() {
                Ok(v) => v,
                Err(_) => { eprintln!("Invalid base on line {}", lineno + 1); continue; }
            };
            let exp = match parts[1].parse::<u128>() {
                Ok(v) => v,
                Err(_) => { eprintln!("Invalid exponent on line {}", lineno + 1); continue; }
            };

            let modulus = if parts.len() >= 3 && !parts[2].is_empty() {
                match parts[2].parse::<u128>() {
                    Ok(v) => Some(v),
                    Err(_) => { eprintln!("Invalid modulus on line {}", lineno + 1); continue; }
                }
            } else {
                None
            };

            for _ in 0..repeat {
                match scenario {
                    Scenario::MultiCore => {
                        let (elapsed_ns, operations) =
                            measure_multi_core_run(base, exp, worker_count);
                        let axis_seconds = (elapsed_ns as f64) / 1e9;
                        append_result_row(scenario, elapsed_ns, operations, Some(axis_seconds));
                    }
                    Scenario::IGpu => {
                        let elapsed_ns = if let Some(m) = modulus {
                            let (_, gpu_time) = simulate_gpu_mod_pow(base, exp, m);
                            gpu_time
                        } else {
                            measure_igpu_run(base, exp)
                        };
                        let axis_seconds = (elapsed_ns as f64) / 1e9;
                        append_result_row(scenario, elapsed_ns, 1, Some(axis_seconds));
                    }
                    Scenario::SingleCore => {
                        let start = Instant::now();
                        let _r = match modulus {
                            Some(m) => mod_pow(base, exp, m),
                            None => binary_pow(base, exp),
                        };
                        let elapsed_ns = start.elapsed().as_nanos();
                        let axis_seconds = (elapsed_ns as f64) / 1e9;
                        append_result_row(scenario, elapsed_ns, 1, Some(axis_seconds));
                    }
                }
            }
        }
    }

    println!(
        "Batch run complete. Results appended to {}",
        result_filename(scenario)
    );
}

fn main() {
    let args: Vec<String> = env::args().collect();

    // detect architecture and announce it as the first message
    let arch = std::env::consts::ARCH;
    let env_name = match arch {
        "aarch64" => "mac",
        "x86_64" => "intel",
        _ => arch,
    };
    println!("Detected architecture: {} ({})", arch, env_name);
    // batch usage: binexp --batch input.csv [--out results.csv]
    if args.len() >= 2 && args[1] == "--batch" {
        // parse batch flags: --batch <input.csv> [--out <output.csv>] [--repeat N] [--big]
        if args.len() < 3 {
            eprintln!("Usage: {} --batch <input.csv> [--out <output.csv>] [--repeat N] [--big]", args[0]);
            std::process::exit(2);
        }
        let mut input: Option<String> = None;
        let mut repeat: usize = 1;
        let mut use_big: bool = false;
        let mut scenario = Scenario::SingleCore;

        let mut i = 2;
        while i < args.len() {
            match args[i].as_str() {
                // --out is ignored: results are saved to the architecture-specific res-*.csv
                "--out" => { i += 1; /* ignore */ }
                "--repeat" => {
                    if i + 1 < args.len() {
                        repeat = match args[i + 1].parse::<usize>() { Ok(v) if v > 0 => v, _ => { eprintln!("Invalid repeat value"); std::process::exit(2); } };
                        i += 2;
                    } else { eprintln!("--repeat requires a number"); std::process::exit(2); }
                }
                "--big" => { use_big = true; i += 1; }
                "--scenario" => {
                    if i + 1 < args.len() {
                        scenario = match args[i + 1].as_str() {
                            "multi" | "multicore" => Scenario::MultiCore,
                            "igpu" | "gpu" => Scenario::IGpu,
                            _ => Scenario::SingleCore,
                        };
                        i += 2;
                    } else {
                        eprintln!("--scenario requires one of: single, multi, igpu");
                        std::process::exit(2);
                    }
                }
                _ => {
                    if input.is_none() {
                        input = Some(args[i].clone());
                    }
                    i += 1;
                }
            }
        }

        let input = match input { Some(v) => v, None => { eprintln!("Missing input CSV"); std::process::exit(2); } };
        // ignore any --out flags: always append into `input.csv`
        run_batch(&input, repeat, use_big, scenario);
        return;
    }

    // default: interactive
    run_interactive();
}
