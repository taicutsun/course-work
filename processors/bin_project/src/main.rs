mod algorithm;
mod benchmark;
mod cli;
mod io;
mod wbgpu;

use std::env;
use io::Scenario;
use cli::{run_interactive, run_batch};

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
        run_batch(&input, repeat, use_big, scenario);
        return;
    }

    // default: interactive
    run_interactive();
}
