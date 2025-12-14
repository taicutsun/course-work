use wgpu;
use pollster;
use bytemuck;

pub struct GpuContext {
    pub device: wgpu::Device,
    pub queue: wgpu::Queue,
}

impl GpuContext {
    pub fn new() -> Self {
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends: wgpu::Backends::all(),
            dx12_shader_compiler: Default::default(),
            flags: wgpu::InstanceFlags::default(),
            gles_minor_version: wgpu::Gles3MinorVersion::default(),
        });
        
        let adapter = pollster::block_on(instance.request_adapter(&wgpu::RequestAdapterOptions {
            power_preference: wgpu::PowerPreference::HighPerformance,
            compatible_surface: None,
            force_fallback_adapter: false,
        })).expect("GPU adapter not available");
        
        let (device, queue) = pollster::block_on(adapter.request_device(
            &wgpu::DeviceDescriptor {
                required_features: wgpu::Features::empty(),
                required_limits: wgpu::Limits::downlevel_defaults(),
                label: None,
            },
            None,
        )).expect("Failed to create GPU device");

        Self { device, queue }
    }
}

pub fn run_compute_shader<T: bytemuck::Pod, U: bytemuck::Pod>(
    context: &GpuContext,
    shader_source: &str,
    shader_label: &str,
    pipeline_label: &str,
    input_data: &T,
) -> U {
    let shader = context.device.create_shader_module(wgpu::ShaderModuleDescriptor {
        label: Some(shader_label),
        source: wgpu::ShaderSource::Wgsl(shader_source.into()),
    });

    let compute_pipeline = context.device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
        label: Some(pipeline_label),
        layout: None,
        module: &shader,
        entry_point: "main",
    });

    let input_buffer = context.device.create_buffer(&wgpu::BufferDescriptor {
        label: Some("Input Buffer"),
        size: std::mem::size_of::<T>() as u64,
        usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
        mapped_at_creation: true,
    });
    
    input_buffer.slice(..).get_mapped_range_mut().copy_from_slice(bytemuck::bytes_of(input_data));
    input_buffer.unmap();

    let output_buffer = context.device.create_buffer(&wgpu::BufferDescriptor {
        label: Some("Output Buffer"),
        size: std::mem::size_of::<U>() as u64,
        usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_SRC,
        mapped_at_creation: false,
    });

    let bind_group = context.device.create_bind_group(&wgpu::BindGroupDescriptor {
        label: Some("Bind Group"),
        layout: &compute_pipeline.get_bind_group_layout(0),
        entries: &[
            wgpu::BindGroupEntry {
                binding: 0,
                resource: input_buffer.as_entire_binding(),
            },
            wgpu::BindGroupEntry {
                binding: 1,
                resource: output_buffer.as_entire_binding(),
            },
        ],
    });

    let mut encoder = context.device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
        label: Some("Compute Encoder"),
    });

    {
        let mut compute_pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
            label: Some("Compute Pass"),
            timestamp_writes: None,
        });
        compute_pass.set_pipeline(&compute_pipeline);
        compute_pass.set_bind_group(0, &bind_group, &[]);
        compute_pass.dispatch_workgroups(1, 1, 1);
    }

    let staging_buffer = context.device.create_buffer(&wgpu::BufferDescriptor {
        label: Some("Staging Buffer"),
        size: std::mem::size_of::<U>() as u64,
        usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
        mapped_at_creation: false,
    });

    encoder.copy_buffer_to_buffer(&output_buffer, 0, &staging_buffer, 0, std::mem::size_of::<U>() as u64);

    let command_buffer = encoder.finish();
    context.queue.submit(Some(command_buffer));

    let buffer_slice = staging_buffer.slice(..);
    let (tx, rx) = std::sync::mpsc::channel();
    buffer_slice.map_async(wgpu::MapMode::Read, move |result| {
        tx.send(result).unwrap();
    });
    context.device.poll(wgpu::Maintain::Wait);
    rx.recv().unwrap().expect("Failed to map buffer");

    let data = buffer_slice.get_mapped_range();
    let result: U = *bytemuck::from_bytes(&data);
    drop(data);
    staging_buffer.unmap();

    result
}
