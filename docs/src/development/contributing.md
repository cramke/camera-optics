# Contributing

Thank you for considering contributing to Camera Optics Calculator!

## Getting Started

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/camera-optics.git
   cd camera-optics
   ```
3. **Create a branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

1. **Make your changes**
2. **Format code**:
   ```bash
   cargo fmt
   pnpm prettier --write .
   ```
3. **Lint**:
   ```bash
   cargo clippy
   pnpm build  # TypeScript checking
   ```
4. **Test**:
   ```bash
   cargo test
   pnpm test
   ```
5. **Commit**:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

## Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting (no code change)
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance

Examples:
- `feat: add hyperfocal distance calculation`
- `fix: correct FOV calculation for wide angle lenses`
- `docs: update API reference`

## Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new features
3. **Ensure CI passes** (all checks must pass)
4. **Request review** from maintainers

## Code Style

### TypeScript

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use single quotes for strings
- 2-space indentation
- Max line length: 100 characters

### Rust

- Follow `rustfmt` defaults
- Use `clippy` recommendations
- Document public APIs with `///` comments
- Prefer `?` operator for error handling

## Testing Requirements

- New features **must** include tests
- Bug fixes **should** include regression tests
- Maintain or improve coverage percentage

## Security

If you discover a security vulnerability:
1. **Do not** open a public issue
2. Email the maintainer directly
3. Provide detailed reproduction steps

## Questions?

- Open an issue for discussion
- Check existing issues/PRs first
- Be respectful and constructive

We appreciate your contributions! 🎉
