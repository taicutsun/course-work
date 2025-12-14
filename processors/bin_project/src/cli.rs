use std::fs::File;
use std::io::{BufRead, BufReader};
use std::time::Instant;
use num_bigint::BigUint;
use rand::SeedableRng;
use rand::rngs::StdRng;

use crate::algorithm::{binary_pow, big_binary_pow};
use crate::benchmark::{measure_single_core_run, measure_multi_core_run, measure_igpu_run, measure_big_single_core_run, measure_big_multi_core_run, measure_big_igpu_run, get_worker_count};
use crate::io::{Scenario, append_result_row, read_u128, read_optional_u128, run_with_spinner, gen_random_u128, gen_random_biguint};

pub fn run_interactive() {
    println!("Binary exponentiation (interactive)");
    println!("Choose input mode: (m)anual, (r)andom, or (s)tatic");
    let mode = loop {
        match crate::io::read_line_trimmed("Mode [m/r/s]: ") {
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
            _ => {
                let res = binary_pow(base, exp);
                let dur = measure_single_core_run(base, exp);
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
        
        let mut biguint_test_cases = Vec::new();
        for (base_hex, exp_hex) in test_cases {
            let base = BigUint::parse_bytes(base_hex.as_bytes(), 16).unwrap();
            let exp = BigUint::parse_bytes(exp_hex.as_bytes(), 16).unwrap();
            biguint_test_cases.push((base, exp));
        }

        let worker_count = get_worker_count();
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
                        measure_big_single_core_run(base.clone(), exp.clone())
                    },
                    Scenario::MultiCore => {
                        measure_big_multi_core_run(base.clone(), exp.clone(), worker_count)
                    },
                    Scenario::IGpu => {
                        measure_big_igpu_run(base.clone(), exp.clone())
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
            let fname = crate::io::result_filename(scenario);
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
        match crate::io::read_line_trimmed("How many random cases to generate? ") {
            Ok(s) => match s.parse::<usize>() {
                Ok(v) if v > 0 => break v,
                _ => println!("Enter a positive integer."),
            },
            Err(e) => { eprintln!("I/O error: {}", e); std::process::exit(1); }
        }
    };

    let include_mod = loop {
        match crate::io::read_line_trimmed("Include modulus? [y/N]: ") {
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
        match crate::io::read_line_trimmed("Max base bits (e.g. 64) [default 64]: ") {
            Ok(s) => {
                if s.is_empty() { break 64usize; }
                match s.parse::<usize>() { Ok(v) if v > 0 => break v, _ => println!("Enter a positive integer."), }
            }
            Err(e) => { eprintln!("I/O error: {}", e); std::process::exit(1); }
        }
    };

    let max_exp_bits = loop {
        match crate::io::read_line_trimmed("Max exponent bits (e.g. 16) [default 16]: ") {
            Ok(s) => {
                if s.is_empty() { break 16usize; }
                match s.parse::<usize>() { Ok(v) if v > 0 => break v, _ => println!("Enter a positive integer."), }
            }
            Err(e) => { eprintln!("I/O error: {}", e); std::process::exit(1); }
        }
    };

    let max_mod_bits = if include_mod {
        loop {
            match crate::io::read_line_trimmed("Max modulus bits (e.g. 64) [default same as base]: ") {
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
                let _start = std::time::Instant::now();
                let r = binary_pow(base, exp);
                (r.to_string(), measure_single_core_run(base, exp))
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
                let r = big_binary_pow(base_b.clone(), exp_b.clone());
                let d = start.elapsed().as_nanos();
                (r, d)
            });
            println!("[{}] base={} exp={} mod={:?} => result(len={}) ({} ns)", i+1, base_b, exp_b, modulus_b, res.to_string().len(), dur);
            append_result_row(Scenario::SingleCore, dur, 1, None);
        }
    }
}

/// Run batch mode: read input CSV with lines: base,exponent[,modulus]
/// Write results CSV with: base,exponent,modulus,result,duration_ns
pub fn run_batch(input: &str, repeat: usize, use_big: bool, scenario: Scenario) {
    let infile = match File::open(input) {
        Ok(f) => f,
        Err(e) => {
            eprintln!("Failed to open input file {}: {}", input, e);
            std::process::exit(1);
        }
    };
    let reader = BufReader::new(infile);

    let worker_count = get_worker_count();

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
                        if let Some(_m) = &modulus_b {
                            let (d, _) = measure_big_igpu_run(base_b.clone(), exp_b.clone());
                            d
                        } else {
                            let (d, _) = measure_big_igpu_run(base_b.clone(), exp_b.clone());
                            d
                        }
                    }
                    Scenario::SingleCore => {
                        let (d, _) = measure_big_single_core_run(base_b.clone(), exp_b.clone());
                        d
                    }
                    Scenario::MultiCore => {
                        let (d, _) = measure_big_multi_core_run(base_b.clone(), exp_b.clone(), worker_count);
                        d
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

            let _modulus = if parts.len() >= 3 && !parts[2].is_empty() {
                match parts[2].parse::<u128>() {
                    Ok(v) => Some(v),
                    Err(_) => { eprintln!("Invalid modulus on line {}", lineno + 1); continue; }
                }
            } else {
                None
            };

            for _ in 0..repeat {
                let elapsed_ns = match scenario {
                    Scenario::MultiCore => {
                        let (d, _) = measure_multi_core_run(base, exp, worker_count);
                        d
                    }
                    Scenario::SingleCore => {
                        measure_single_core_run(base, exp)
                    }
                    Scenario::IGpu => {
                        measure_igpu_run(base, exp)
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
        }
    }

    println!(
        "Batch run complete. Results appended to {}",
        crate::io::result_filename(scenario)
    );
}
