# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## 4.3.0 - 2024-09-20

## 4.2.0 - 2024-01-03

### Added

- New `getPowerState` function on `LGTV` allowing testing if the TV is on, off,
  or in an unknown state.

## 4.1.1 - 2023-12-31

### Fixed

- Add missing tslib package dependency.

## 4.1.0 - 2023-12-30

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
