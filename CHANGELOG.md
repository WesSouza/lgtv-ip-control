# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- New `powerOnAndConnect` function on `LGTV` which will retry the connection
  while the TV powers on.
- Improvements to TinySocket connection handling and tests.

### Changed

- CLI `power on` now waits until the TV can receive commands.

### Fixed

- Handle getCurrentApp response when the TV is powered off.

## 4.0.2 - 2023-12-23

### Added

- Changelog
