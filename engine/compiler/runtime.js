(() => {
  'use strict';

  const bundleUrl = new URL('toolchain/toolchain.js', document.currentScript.src);
  const limits = { compile: 15000, run: 2500 };
  let bundle;
  let currentWorker;
  let queue = Promise.resolve();

  function loadToolchain() {
    if (bundle) return bundle;
    bundle = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = bundleUrl.href;
      script.onload = () => {
        const toolchain = globalThis.C_TUTORIAL_TOOLCHAIN;
        delete globalThis.C_TUTORIAL_TOOLCHAIN;
        script.remove();
        if (toolchain) resolve(toolchain);
        else reject(new Error('The local C compiler data is incomplete.'));
      };
      script.onerror = () => {
        script.remove();
        reject(new Error('The C compiler files could not be read. Keep the assets folder beside index.html.'));
      };
      document.head.append(script);
    }).catch(error => {
      bundle = undefined;
      throw error;
    });
    return bundle;
  }

  async function getWorker() {
    if (currentWorker) return currentWorker;
    if (!globalThis.Worker || !globalThis.WebAssembly || !globalThis.DecompressionStream) {
      throw new Error('The C editor needs a browser with WebAssembly, Workers, and gzip decompression.');
    }
    const toolchain = await loadToolchain();
    const url = URL.createObjectURL(new Blob([`(${compilerWorker.toString()})();`], { type: 'text/javascript' }));
    let worker;
    try {
      worker = new Worker(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Starting the C compiler took too long.')), 30000);
        worker.onmessage = ({ data }) => {
          clearTimeout(timer);
          if (data.type === 'ready') resolve();
          else reject(new Error(data.message || 'The C compiler could not start.'));
        };
        worker.onerror = () => {
          clearTimeout(timer);
          reject(new Error('The browser could not start the C compiler worker.'));
        };
        worker.postMessage({ type: 'setup', toolchain });
      });
    } catch (error) {
      worker.terminate();
      throw error;
    }
    currentWorker = worker;
    return worker;
  }

  function stopWorker(worker) {
    worker.terminate();
    currentWorker = undefined;
  }

  async function execute(source) {
    if (new TextEncoder().encode(source).length > 128 * 1024) {
      return { stdout: '', stderr: 'The browser compiler accepts up to 128 KB of C source.', exitCode: 1, stage: 'compile' };
    }
    const worker = await getWorker();
    return new Promise((resolve, reject) => {
      let timer;
      function watch(stage) {
        clearTimeout(timer);
        timer = setTimeout(() => {
          stopWorker(worker);
          const stderr = stage === 'run'
            ? 'Execution timed out after 2.5 seconds.'
            : 'Compilation timed out after 15 seconds.';
          resolve({ stdout: '', stderr, exitCode: 124, stage });
        }, limits[stage]);
      }
      worker.onmessage = ({ data }) => {
        if (data.type === 'running') {
          watch('run');
          return;
        }
        clearTimeout(timer);
        if (data.type === 'result') resolve(data.result);
        else {
          stopWorker(worker);
          reject(new Error(data.message || 'The compiler worker failed.'));
        }
      };
      worker.onerror = () => {
        clearTimeout(timer);
        stopWorker(worker);
        reject(new Error('The compiler worker stopped unexpectedly.'));
      };
      watch('compile');
      worker.postMessage({ type: 'execute', source });
    });
  }

  globalThis.CCompiler = Object.freeze({
    run(source) {
      const result = queue.then(() => execute(source));
      queue = result.catch(() => {});
      return result;
    },
    // Starts loading the compiler without running anything.
    warm() {
      queue = queue.then(() => getWorker()).then(() => {}, () => {});
    },
  });

  // Constructing this worker from a Blob lets the application run from file://.
  function compilerWorker() {
    const success = 0;
    const badFileDescriptor = 8;
    const badAddress = 21;
    const unsupported = 52;
    const libraryDirectory = 'lib/wasm32-wasi';
    const clangDirectory = 'lib/clang/8.0.1';
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const outputLimit = 32 * 1024;
    let tools;

    class Exit extends Error {
      constructor(code) {
        super(`Process exited with status ${code}.`);
        this.code = code;
      }
    }

    function captureOutput() {
      const streams = new Map([1, 2].map(fd => [fd, {
        bytes: new Uint8Array(outputLimit), length: 0, truncated: false,
      }]));
      function write(fd, bytes, length = bytes.length) {
        const stream = streams.get(fd);
        const size = Math.min(bytes.length, outputLimit - stream.length);
        stream.bytes.set(bytes.subarray(0, size), stream.length);
        stream.length += size;
        stream.truncated ||= size < length;
      }
      function read(fd) {
        const { bytes, length, truncated } = streams.get(fd);
        const text = decoder.decode(bytes.subarray(0, length));
        return truncated ? `${text}\n[Output limited to 32 KB.]\n` : text;
      }
      return { write, read };
    }

    // These functions are the only host services granted to an executed C program.
    // The compiler and linker additionally receive a RAM-only sysroot file system.
    function wasiHost(getMemory, args, output) {
      const argv = args.map(arg => encoder.encode(`${arg}\0`));
      const memory = () => new DataView(getMemory().buffer);
      return {
        proc_exit(code) { throw new Exit(code); },
        args_sizes_get(count, bufferSize) {
          const view = memory();
          view.setUint32(count, argv.length, true);
          view.setUint32(bufferSize, argv.reduce((sum, arg) => sum + arg.length, 0), true);
          return success;
        },
        args_get(pointers, buffer) {
          const view = memory();
          const bytes = new Uint8Array(view.buffer);
          for (const arg of argv) {
            view.setUint32(pointers, buffer, true);
            bytes.set(arg, buffer);
            pointers += 4;
            buffer += arg.length;
          }
          return success;
        },
        environ_sizes_get(count, bufferSize) {
          const view = memory();
          view.setUint32(count, 0, true);
          view.setUint32(bufferSize, 0, true);
          return success;
        },
        environ_get() { return success; },
        fd_write(fd, vectors, count, bytesWritten) {
          if (fd !== 1 && fd !== 2) return badFileDescriptor;
          const view = memory();
          if (vectors < 0 || count < 0 || vectors + 8 * count > view.byteLength ||
              bytesWritten < 0 || bytesWritten + 4 > view.byteLength) return badAddress;
          let size = 0;
          for (let index = 0; index < count; index++) {
            const start = view.getUint32(vectors + 8 * index, true);
            const length = view.getUint32(vectors + 8 * index + 4, true);
            if (start + length > view.byteLength) return badAddress;
            output.write(fd, new Uint8Array(view.buffer, start, Math.min(length, outputLimit)), length);
            size += length;
          }
          view.setUint32(bytesWritten, size, true);
          return success;
        },
        fd_read(fd, _vectors, _count, bytesRead) {
          if (fd !== 0) return badFileDescriptor;
          memory().setUint32(bytesRead, 0, true);
          return success;
        },
        fd_fdstat_get(fd, buffer) {
          if (fd !== 0 && fd !== 1 && fd !== 2) return badFileDescriptor;
          const view = memory();
          new Uint8Array(view.buffer, buffer, 24).fill(0);
          view.setUint8(buffer, 2); // WASI character device.
          view.setBigUint64(buffer + 8, fd === 0 ? 2n : 64n, true);
          return success;
        },
        fd_close(fd) { return fd >= 0 && fd <= 2 ? success : badFileDescriptor; },
        fd_prestat_get() { return badFileDescriptor; },
        random_get(buffer, size) {
          // getRandomValues has a fixed per-call quota.
          const bytes = new Uint8Array(getMemory().buffer, buffer, size);
          for (let index = 0; index < size; index += 65536) {
            crypto.getRandomValues(bytes.subarray(index, index + 65536));
          }
          return success;
        },
        clock_time_get(id, _precision, result) {
          const time = id === 0 ? Date.now() : Math.floor(performance.now());
          memory().setBigUint64(result, BigInt(time) * 1000000n, true);
          return success;
        },
      };
    }

    async function process(module, args, output, fileSystem) {
      let instance;
      const getMemory = () => instance.exports.memory;
      const host = wasiHost(getMemory, args, output);
      const wasi = fileSystem ? { ...host, ...fileSystem.exports } : host;
      const imports = Object.create(null);
      for (const entry of WebAssembly.Module.imports(module)) {
        if (entry.module === 'wasi_unstable' && entry.kind === 'function') {
          imports[entry.name] = Object.hasOwn(wasi, entry.name) ? wasi[entry.name] : () => unsupported;
        }
      }
      instance = await WebAssembly.instantiate(module, { wasi_unstable: imports });
      if (fileSystem) fileSystem.attach(getMemory, host);
      try {
        instance.exports._start();
        return 0;
      } catch (error) {
        if (error instanceof Exit) return error.code;
        throw error;
      }
    }

    // The MemFS adapter uses the wasm-clang demo's WASM file system interface.
    async function createFileSystem(module, archive) {
      let instance;
      let hostMemory;
      let host;
      const env = {
        memfs_log() {},
        host_write(...args) { return host.fd_write(...args); },
        host_read(...args) { return host.fd_read(...args); },
        copy_out(target, source, size) {
          new Uint8Array(hostMemory().buffer, target, size).set(bytes(source, size));
        },
        copy_in(target, source, size) {
          bytes(target, size).set(new Uint8Array(hostMemory().buffer, source, size));
        },
      };
      instance = await WebAssembly.instantiate(module, { env });
      const fs = instance.exports;
      fs.init();

      function bytes(start, size) {
        return new Uint8Array(fs.memory.buffer, start, size);
      }
      function pathToBuffer(path) {
        const pathBytes = encoder.encode(path);
        bytes(fs.GetPathBuf(), pathBytes.length).set(pathBytes);
        return pathBytes.length;
      }
      function addFile(path, data) {
        const inode = fs.AddFileNode(pathToBuffer(path), data.length);
        bytes(fs.GetFileNodeAddress(inode), data.length).set(data);
      }
      function readFile(path) {
        const inode = fs.FindNode(pathToBuffer(path));
        return bytes(fs.GetFileNodeAddress(inode), fs.GetFileNodeSize(inode));
      }

      // Only ordinary files and directories from the bundled ustar archive are loaded.
      const archiveBytes = new Uint8Array(archive);
      function readField(offset, width) {
        const field = archiveBytes.subarray(offset, offset + width);
        const end = field.indexOf(0);
        return decoder.decode(end >= 0 ? field.subarray(0, end) : field);
      }
      for (let offset = 0; offset + 512 <= archiveBytes.length && archiveBytes[offset];) {
        const name = readField(offset, 100);
        const prefix = readField(offset + 345, 155);
        const path = prefix ? `${prefix}/${name}` : name;
        const size = parseInt(readField(offset + 124, 12), 8);
        const type = readField(offset + 156, 1);
        if (type === '5') fs.AddDirectoryNode(pathToBuffer(path));
        if (type === '0' || type === '') addFile(path, archiveBytes.subarray(offset + 512, offset + 512 + size));
        offset += 512 + Math.ceil(size / 512) * 512;
      }

      return {
        exports: fs, addFile, readFile,
        attach(getMemory, hostInterface) {
          hostMemory = getMemory;
          host = hostInterface;
        },
      };
    }

    async function unpack(encoded) {
      let bytes;
      if (Uint8Array.fromBase64) {
        bytes = Uint8Array.fromBase64(encoded);
      } else {
        const binary = atob(encoded);
        bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
      }
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      return new Response(stream).arrayBuffer();
    }

    async function setup(toolchain) {
      const module = async name => WebAssembly.compile(await unpack(toolchain[name]));
      const [clang, lld, memfs, archive] = await Promise.all([
        module('clang'), module('lld'), module('memfs'), unpack(toolchain.sysroot),
      ]);
      tools = { clang, lld, memfs, archive };
    }

    async function compileAndRun(source) {
      const output = captureOutput();
      const result = (exitCode, stage) => ({ stdout: output.read(1), stderr: output.read(2), exitCode, stage });
      let stage = 'compile';
      try {
        const fs = await createFileSystem(tools.memfs, tools.archive);
        fs.addFile('lesson.c', encoder.encode(source));
        const compileStatus = await process(tools.clang, [
          'clang', '-cc1', '-triple', 'wasm32-unknown-wasi', '-std=c17', '-x', 'c',
          '-isysroot', '/', '-internal-isystem', `/${clangDirectory}/include`,
          '-internal-isystem', '/include', '-fno-common', '-Wall', '-Wextra', '-Wno-unused-parameter', '-Werror=implicit-function-declaration',
          '-ferror-limit', '12', '-emit-obj', '-o', 'lesson.o', 'lesson.c',
        ], output, fs);
        if (compileStatus !== 0) return result(compileStatus, stage);

        const linkStatus = await process(tools.lld, [
          'wasm-ld', '--no-threads', '-z', 'stack-size=1048576', '--max-memory=67108864',
          `-L${libraryDirectory}`, `${libraryDirectory}/crt1.o`, 'lesson.o', '-lc', '-lm',
          `${clangDirectory}/lib/wasi/libclang_rt.builtins-wasm32.a`, '-o', 'lesson.wasm',
        ], output, fs);
        if (linkStatus !== 0) return result(linkStatus, stage);

        const executable = await WebAssembly.compile(fs.readFile('lesson.wasm'));
        stage = 'run';
        self.postMessage({ type: 'running' });
        return result(await process(executable, ['lesson.wasm'], output), stage);
      } catch (error) {
        const label = stage === 'run' ? 'Program stopped' : 'Compiler stopped';
        output.write(2, encoder.encode(`${label}: ${error.message}\n`));
        return result(1, stage);
      }
    }

    self.onmessage = async ({ data }) => {
      try {
        if (data.type === 'setup') {
          await setup(data.toolchain);
          self.postMessage({ type: 'ready' });
        }
        if (data.type === 'execute') {
          self.postMessage({ type: 'result', result: await compileAndRun(data.source) });
        }
      } catch (error) {
        self.postMessage({ type: 'failure', message: error.message });
      }
    };
  }
})();
