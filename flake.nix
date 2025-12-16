{
  description = "camera-optics dev env";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        runtimePkgs = with pkgs; [
          gtk3
          gdk-pixbuf
          pango
          harfbuzz
          cairo
          webkitgtk_4_1
          libsoup_3
          libayatana-appindicator
          glib
          zlib
          libglvnd
          libcanberra-gtk3
          mesa
          xorg.libX11
          wayland
        ];
        dataPkgs = with pkgs; [
          libcanberra
          gsettings-desktop-schemas
          adwaita-icon-theme
        ];
        shell = pkgs.mkShell {
          buildInputs = runtimePkgs ++ dataPkgs ++ [
            pkgs.nodejs_20
            pkgs.pnpm
            pkgs.rustup            # install Rust toolchains as declared in rust-toolchain.toml if you have one
            pkgs.cargo
            pkgs.pre-commit
            pkgs.mdbook            # For building the documentation
            pkgs.pkg-config
            pkgs.openssl           # common native deps
            pkgs.protobuf          # if tauri build needs it
          ];
          shellHook = ''
            pnpm install --frozen-lockfile
            pre-commit install
            export PS1="[nix] $PS1"
            export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath runtimePkgs}:$LD_LIBRARY_PATH
            export XDG_DATA_DIRS=${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.adwaita-icon-theme}/share:${pkgs.libcanberra}/share:$XDG_DATA_DIRS
            export GTK_PATH=${pkgs.libcanberra-gtk3}/lib/gtk-3.0
            export LIBGL_DRIVERS_PATH=${pkgs.mesa.drivers}/lib/dri # required for hardware accelleration. Will not work due to nix sandboxing.
            export GBM_DRIVERS_PATH=${pkgs.mesa.drivers}/lib/dri # required for hardware accelleration. Will not work due to nix sandboxing.
          '';
        };
      in {
        devShells.default = shell;
        packages.default = shell;
      });
}
