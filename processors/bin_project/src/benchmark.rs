use crate::algorithm::{binary_pow, big_binary_pow};
use crate::wbgpu::gpu::{gpu_pow, gpu_big_pow};
use std::time::Instant;
use std::thread;

pub fn measure_single_core_run(base: u128, exp: u128) -> u128 {
    let start = Instant::now();
    let _ = binary_pow(base, exp);
    start.elapsed().as_nanos()
}

pub fn measure_multi_core_run(base: u128, exp: u128, workers: usize) -> (u128, u64) {
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

pub fn measure_big_single_core_run(base: num_bigint::BigUint, exp: num_bigint::BigUint) -> (u128, u64) {
    let start = Instant::now();
    let _ = big_binary_pow(base.clone(), exp.clone());
    (start.elapsed().as_nanos(), 1)
}

pub fn measure_big_multi_core_run(base: num_bigint::BigUint, exp: num_bigint::BigUint, workers: usize) -> (u128, u64) {
    let threads = workers.max(2);
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
}

pub fn measure_igpu_run(base: u128, exp: u128) -> u128 {
    let (_, gpu_time) = gpu_pow(base, exp);
    gpu_time
}

pub fn measure_big_igpu_run(base: num_bigint::BigUint, exp: num_bigint::BigUint) -> (u128, u64) {
    let (_, gpu_time) = gpu_big_pow(base.clone(), exp.clone());
    (gpu_time, 1)
}

pub fn get_worker_count() -> usize {
    thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4)
        .min(8)
        .max(2)
}
