# Workflow

This guide describes the issue and merge workflow for the isolex project.

- [Workflow](#workflow)
  - [Branches](#branches)
  - [Issues](#issues)
    - [Source](#source)
    - [Status](#status)
    - [Type](#type)
      - [Bug](#bug)
      - [Feature](#feature)
      - [Update](#update)
  - [Merges](#merges)
  - [Release](#release)
  - [Updates](#updates)

## Branches

Branch early, commit often.

Rebase on the target branch before creating a PR to ensure minimal differences.

## Issues

Issues are broken down by the `service` they impact (with `service/other` as a catch-all) and their current `status`.

- [Create a new bug](https://github.com/ssube/isolex/issues/new?template=type_bug.md).
- [Create a new feature](https://github.com/ssube/isolex/issues/new?template=type_feature.md).
- [Create a new update](https://github.com/ssube/isolex/issues/new?template=type_update.md).

Every bug fix must add tests to prevent regression.

### Source

The directory to which the issue applies.

### Status

New issues should be confirmed (to exist, get details, etc) before any planning happens. Issues with a feature branch
are in progress. Finally, issues should not be closed until the fix can be confirmed.

![issue workflow diagram](./workflow.png)

### Type

#### Bug

Bugs are problems with documented behavior, missing features that should exist, or anything else that seems out of
place.

[Create a new bug](https://github.com/ssube/isolex/issues/new?template=type_bug.md).

#### Feature

Features are new feature requests, new options, and other suggestions to add things.

[Create a new feature](https://github.com/ssube/isolex/issues/new?template=type_feature.md).

#### Update

Updates are routine updates of existing features and dependencies, with any associated work to update options or tests.

[Create a new update](https://github.com/ssube/isolex/issues/new?template=type_update.md).

## Merges

The `master` branch is the stable, usable branch and is automatically deployed.

Code should only be merged into master after:

- a pipeline has run and passed
- tests have been written and pass
- coverage has not decreased
- lint warnings have been resolved

Branches should be squashed before merging and the merge commit must follow
[conventional commit](https://www.conventionalcommits.org/en/v1.0.0-beta.2/) syntax. Valid prefixes are:

- `build` (type/build)
  - build script and pipeline changes
  - no source changes or functional impact
- `deps` (type/update)
  - dependency updates with corresponding source changes
- `docs` (type/docs)
  - documentation changes
  - no source changes or functional impact
- `feat` (type/feature)
  - new features with corresponding feature tests
- `fix` (type/bug)
  - bug fixes with corresponding regression tests
- `lint` (type/lint)
  - small changes for tslint, code climate, etc checks
  - no functional impact
- `test` (type/test)
  - new tests or fixes with no source changes

## Release

The release process is mostly handled by Gitlab. The only human intervention required is to tag and cut the release.

1. Update the readme's "commits since" badge for the new release
2. `git add README.md`
3. `make release`

This will update the changelog, commit everything, tag it, and push. Once Gitlab picks up the tag, the pipeline will
build and publish a release bundle.

## Updates

Greenkeeper is set up to handle most updates. Not all libraries have great test coverage yet, but this will catch any
type issues and create a PR to be manually tested.

Dependencies with security issues MUST be updated as soon as possible.

Generally update dependencies one (or a related few) at a time. Try not to update dev and prod dependencies at the
same time. Be careful updating native dependencies, although the container build will ensure the correct binaries are
available.

Dependency versions [should be pinned](https://greenkeeper.io/faq.html#pinning-versions) to a single numeric version
so that Greenkeeper will create PRs for changes. Otherwise, updates will not change the package version, so a new lock
file will not be created.
