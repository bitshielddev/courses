# Browser C toolchain

`toolchain.js` contains gzip-compressed, base64-encoded copies of Clang 8.0.1, LLD, and MemFS WebAssembly binaries, plus a C sysroot. A classic script can load these assets directly from the filesystem when the page is opened as `file://`.

- Clang, LLD, MemFS, and the sysroot archive come from [`binji/wasm-clang` at commit `648c4a89997a351eef75cdaec3ef5b89d4937dec`](https://github.com/binji/wasm-clang/tree/648c4a89997a351eef75cdaec3ef5b89d4937dec). See [LICENSE.wasm-clang](LICENSE.wasm-clang) and [LICENSE.llvm](LICENSE.llvm).
- The LLVM source and MemFS implementation for the demo are available in [Binji's LLVM fork](https://github.com/binji/llvm-project/tree/master/binji). The browser adapter in `runtime.js` uses that MemFS interface.
- The bundled C sysroot keeps the C headers and libraries and omits C++/canvas components from the upstream `sysroot.tar`. The C library is from the [WASI SDK 5 sysroot](https://github.com/WebAssembly/wasi-sdk/tree/wasi-sdk-5) and includes [WASI libc](https://github.com/WebAssembly/wasi-libc/tree/8e8cc34aadefb45955e706503fe70f582b3e3606), musl, cloudlibc, libpreopen, and dlmalloc. Their notices are in [LICENSE.wasi-sysroot](LICENSE.wasi-sysroot), [COPYRIGHT.musl](COPYRIGHT.musl), [LICENSE.cloudlibc](LICENSE.cloudlibc), [LICENSE.libpreopen](LICENSE.libpreopen), and [LICENSE.CC0](LICENSE.CC0).

Compiler output targets 32-bit WebAssembly. Programs execute in a dedicated Worker with a 64 MiB linear memory limit and access to standard output and error. Standard input is empty, and programs have no host filesystem or network imports.
