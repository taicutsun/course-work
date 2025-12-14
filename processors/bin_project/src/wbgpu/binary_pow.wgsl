@group(0) @binding(0)
var<storage, read> input: vec2<u32>;

@group(0) @binding(1)
var<storage, read_write> output: u32;

@compute @workgroup_size(1)
fn main() {
    let base = input.x;
    let exp = input.y;
    
    var result: u32 = 1u;
    var current_exp = exp;
    var current_base = base;
    
    while (current_exp > 0u) {
        if ((current_exp & 1u) != 0u) {
            result = result * current_base;
        }
        current_base = current_base * current_base;
        current_exp = current_exp >> 1u;
    }
    
    output = result;
}
