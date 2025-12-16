{
  description = "camera-optics dev env";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        shell = pkgs.mkShell {
          buildInputs = [
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
          '';
        };
      in {
        devShells.default = shell;
        packages.default = shell;
      });
}
