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
        inherit (pkgs) lib;

        # The GTK/WebKit stack Tauri links against on Linux. macOS uses the
        # system WKWebView instead, so none of this is referenced there.
        linuxRuntimePkgs = with pkgs; [
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

        linuxDataPkgs = with pkgs; [
          libcanberra
          gsettings-desktop-schemas
          adwaita-icon-theme
        ];

        darwinPkgs = with pkgs; [
          libiconv      # rust links against this on darwin
          apple-sdk_15  # tauri 2 needs a recent WebKit/WKWebView SDK
        ];

        commonPkgs = with pkgs; [
          nodejs_20
          pnpm
          rustup         # provides the cargo/rustc shims
          pre-commit
          mdbook         # For building the documentation
          pkg-config
          openssl        # common native deps
          protobuf       # if tauri build needs it
        ];

        linuxEnv = ''
          export LD_LIBRARY_PATH=${lib.makeLibraryPath linuxRuntimePkgs}:$LD_LIBRARY_PATH
          export XDG_DATA_DIRS=${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.adwaita-icon-theme}/share:${pkgs.libcanberra}/share:$XDG_DATA_DIRS
          export GTK_PATH=${pkgs.libcanberra-gtk3}/lib/gtk-3.0
          # required for hardware accelleration. Will not work due to nix sandboxing.
          # (mesa no longer has a separate `drivers` output; GBM backends live in pkgs.libgbm)
          export LIBGL_DRIVERS_PATH=${pkgs.mesa}/lib/dri
        '';

        shell = pkgs.mkShell {
          buildInputs = commonPkgs
            ++ lib.optionals pkgs.stdenv.isLinux (linuxRuntimePkgs ++ linuxDataPkgs)
            ++ lib.optionals pkgs.stdenv.isDarwin darwinPkgs;

          shellHook = ''
            pnpm install --frozen-lockfile
            pre-commit install
            export PS1="[nix] $PS1"
          '' + lib.optionalString pkgs.stdenv.isLinux linuxEnv;
        };
      in {
        devShells.default = shell;
        packages.default = shell;
      });
}
