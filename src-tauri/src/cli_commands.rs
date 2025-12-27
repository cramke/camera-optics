use clap::{Parser, Subcommand};
use tauri_app_lib::optics::*;

#[derive(Parser)]
#[command(name = "camera-optics-cli")]
#[command(about = "Camera optics calculator - FOV, resolution, and depth of field", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Calculate field of view and spatial resolution
    Fov {
        /// Sensor width in millimeters
        #[arg(short = 'W', long)]
        sensor_width: f64,

        /// Sensor height in millimeters
        #[arg(short = 'H', long)]
        sensor_height: f64,

        /// Horizontal pixel count
        #[arg(short = 'x', long)]
        pixel_width: u32,

        /// Vertical pixel count
        #[arg(short = 'y', long)]
        pixel_height: u32,

        /// Focal length in millimeters
        #[arg(short = 'f', long)]
        focal_length: f64,

        /// Working distance in millimeters
        #[arg(short = 'd', long)]
        distance: f64,

        /// Optional name for the camera system
        #[arg(short = 'n', long)]
        name: Option<String>,
    },

    /// Calculate hyperfocal distance
    Hyperfocal {
        /// Focal length in millimeters
        #[arg(short = 'f', long)]
        focal_length: f64,

        /// F-number (aperture)
        #[arg(short = 'a', long)]
        f_number: f64,

        /// Circle of confusion in millimeters (default: 0.03 for full frame)
        #[arg(short = 'c', long, default_value = "0.03")]
        coc: f64,
    },

    /// Calculate depth of field
    Dof {
        /// Object distance in millimeters
        #[arg(short = 'd', long)]
        distance: f64,

        /// Focal length in millimeters
        #[arg(short = 'f', long)]
        focal_length: f64,

        /// F-number (aperture)
        #[arg(short = 'a', long)]
        f_number: f64,

        /// Circle of confusion in millimeters (default: 0.03 for full frame)
        #[arg(short = 'c', long, default_value = "0.03")]
        coc: f64,
    },

    /// Compare multiple camera presets
    Compare {
        /// Working distance in millimeters
        #[arg(short = 'd', long)]
        distance: f64,

        /// Use common sensor presets (full-frame, aps-c, micro-43)
        #[arg(long)]
        presets: bool,
    },

    /// Calculate focal length from field of view
    FocalLength {
        /// Sensor size in millimeters (width or height depending on FOV type)
        #[arg(short = 's', long)]
        sensor_size: f64,

        /// Field of view in degrees
        #[arg(short = 'f', long)]
        fov: f64,

        /// Whether this is horizontal FOV (default) or vertical FOV
        #[arg(short = 'v', long)]
        vertical: bool,
    },
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::Fov {
            sensor_width,
            sensor_height,
            pixel_width,
            pixel_height,
            focal_length,
            distance,
            name,
        } => {
            let mut camera = CameraSystem::new(
                sensor_width,
                sensor_height,
                pixel_width,
                pixel_height,
                focal_length,
            );

            if let Some(name) = name {
                camera = camera.with_name(name);
            }

            println!("{}", camera);
            println!();

            let result = calculate_fov(&camera, distance);
            println!("{}", result);
        }

        Commands::Hyperfocal {
            focal_length,
            f_number,
            coc,
        } => {
            let hyperfocal = calculate_hyperfocal(focal_length, f_number, coc);
            println!(
                "Hyperfocal Distance: {:.2} mm ({:.2} m)",
                hyperfocal,
                hyperfocal / 1000.0
            );
            println!("Focal Length: {} mm", focal_length);
            println!("F-number: f/{}", f_number);
            println!("Circle of Confusion: {} mm", coc);
        }

        Commands::Dof {
            distance,
            focal_length,
            f_number,
            coc,
        } => {
            let (near, far, total) = calculate_dof(distance, focal_length, f_number, coc);

            println!("Depth of Field Calculation");
            println!("==========================");
            println!(
                "Object Distance: {:.2} mm ({:.2} m)",
                distance,
                distance / 1000.0
            );
            println!("Focal Length: {} mm", focal_length);
            println!("F-number: f/{}", f_number);
            println!("Circle of Confusion: {} mm", coc);
            println!();
            println!("Near Limit: {:.2} mm ({:.2} m)", near, near / 1000.0);

            if far.is_infinite() {
                println!("Far Limit: ∞ (infinity)");
            } else {
                println!("Far Limit: {:.2} mm ({:.2} m)", far, far / 1000.0);
            }

            if total.is_infinite() {
                println!("Total DOF: ∞ (infinity)");
            } else {
                println!("Total DOF: {:.2} mm ({:.2} m)", total, total / 1000.0);
            }
        }

        Commands::Compare { distance, presets } => {
            let cameras = if presets {
                vec![
                    CameraSystem::new(36.0, 24.0, 6000, 4000, 50.0).with_name("Full Frame - 50mm"),
                    CameraSystem::new(23.5, 15.6, 6000, 4000, 35.0).with_name("APS-C - 35mm"),
                    CameraSystem::new(17.3, 13.0, 5184, 3888, 25.0).with_name("Micro 4/3 - 25mm"),
                ]
            } else {
                println!("Use --presets flag to compare common sensor formats");
                return;
            };

            println!(
                "Comparing camera systems at {} mm ({} m) distance:\n",
                distance,
                distance / 1000.0
            );

            for camera in &cameras {
                println!("{}", camera);
                let result = calculate_fov(camera, distance);
                println!("{}", result);
                println!("{}", "=".repeat(80));
                println!();
            }
        }

        Commands::FocalLength {
            sensor_size,
            fov,
            vertical,
        } => {
            let focal_length = calculate_focal_length_from_fov(sensor_size, fov);

            let fov_type = if vertical { "Vertical" } else { "Horizontal" };

            println!("Focal Length Calculation");
            println!("========================");
            println!("Sensor Size: {} mm", sensor_size);
            println!("{} FOV: {}°", fov_type, fov);
            println!();
            println!("Calculated Focal Length: {:.2} mm", focal_length);
        }
    }
}
