# CI patches

Changes to files under `.github/workflows/` need the GitHub `workflow`
scope to be pushed, which the session that prepared this branch did
not have. They are kept here as patches instead. Apply them from the
repository root with:

```sh
git am .patches/*.patch
```

| Patch | Change |
| ----- | ------ |
| `0001-ci-master-node-matrix.patch` | `build.yml`: trigger on the `master` default branch as well as `main`, and run the build on a Node.js 24 and 22 matrix. |

Once a patch has been applied and pushed, delete it from this folder.
