const spawn = require('cross-spawn');
const { execSync } = require('child_process');

function resolveRun(exitCode, stdout, stderr) {
    stdout = stdout && stdout.toString();
    stderr = stderr && stderr.toString();

    if (exitCode !== 0) {
        return Object.assign(new Error(`Command failed, exited with code #${exitCode}`), {
            exitCode,
            stdout,
            stderr,
        });
    }

    return {
        stdout,
        stderr,
    };
}

module.exports = {
    /**
    * 多行命令行的间隔符号，win用'&'，mac用';'
    * @return {[string]}
    */
    getCommandSplit() {
        let split = ';'
        if (process.platform === 'win32') {
            split = "&"
        }

        return split
    },
    /**
   * 执行commandline
   * @return {[type]} [description]
   */
    execCommandSync(commands, options) {
        if (Object.prototype.toString.call(commands) === '[object String]') {
            commands = [commands]
        }

        const commandSplit = this.getCommandSplit()
        const buffer = execSync(commands.join(commandSplit), options);
        return buffer.toString();
    },
  
   
    /**
     * 异步执行命令
     * @param {*} command 
     * @param {*} args 
     * @param {*} options  {stdio: 'inherit'}, 类似真实环境执行命令，可保留控制台颜色
     * @returns 
     */
    runAsync(command, args, options) {
        const cp = spawn(command, args, options);

        const promise = new Promise((resolve, reject) => {
            let stdout = null;
            let stderr = null;

            cp.stdout && cp.stdout.on('data', (data) => {
                stdout = stdout || new Buffer('');
                stdout = Buffer.concat([stdout, data]);
            });

            cp.stderr && cp.stderr.on('data', (data) => {
                stderr = stderr || new Buffer('');
                stderr = Buffer.concat([stderr, data]);
            });

            const cleanupListeners = () => {
                cp.removeListener('error', onError);
                cp.removeListener('close', onClose);
            };

            const onError = (err) => {
                cleanupListeners();
                reject(err);
            };

            const onClose = (code) => {
                cleanupListeners();

                const resolved = resolveRun(code, stdout, stderr);

                if (resolved instanceof Error) {
                    reject(resolved);
                } else {
                    resolve(resolved);
                }
            };

            cp.on('error', onError)
                .on('close', onClose);
        });
        return promise;
    }
}