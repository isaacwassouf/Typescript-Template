
import { spawnSync, spawn, ChildProcess } from "child_process";
import { readFile, writeFile } from "fs-extra";
import ora from 'ora';
import logSymbols from 'log-symbols';
import inquirer from 'inquirer';
import {join} from 'path';

abstract class BaseSetup{

    initNpm(): Promise<ChildProcess> {
        return new Promise((resolve, reject) => {
    
            const npmInit = spawn("npm", ["init","-y"], {
                cwd: join('.',folder)
            });
    
            // npmInit.stdout.on("data",(data) => {
            //     console.log(data.toString());
            // });
    
            // const passDataToNpmProcess = () => {
            //     npmInit.stdin.write(process.stdin.read());
            // }
    
            // process.stdin.on("readable",passDataToNpmProcess);
    
            npmInit.on("close", () => {
                // process.stdin.removeListener("readable", passDataToNpmProcess);
                console.log(logSymbols.success,'Initlized NPM successfully!')
                resolve(npmInit);
            });
    
            npmInit.on("error", (err) => {
                // process.stdin.removeListener("readable", passDataToNpmProcess);
                console.log(logSymbols.error,'Failed to initlize NPM!')
                reject(err);
            })
    
        });
    };

    initTsc() {
        return new Promise((resolve, reject) => {
    
            const initTsc = spawn("npx", ["tsc", "--init"], { cwd: join('.',folder)});
            initTsc.on("close", () => {
                console.log(logSymbols.success,'Initlized TS successfully!')
                resolve(initTsc);
            });
    
            initTsc.on("error", (err) => {
                console.log(logSymbols.error,'Failed to initlized TS!')
                reject(err);
            })
        });
    };

    abstract installPackages(): Promise<ChildProcess>;

    abstract editPackageJson(): Promise<void>;

    async editTsconfigJson(): Promise<void>{
        let tsconfigRawData = await readFile(`./${folder}/tsconfig.json`, "utf-8");
        tsconfigRawData = tsconfigRawData.replace(/\/\/\s*"rootDir":\s*"\.\/",/, '"rootDir": "./src",')
        .replace(/\/\/\s*"outDir":\s*"\.\/",/, '"outDir": "./dist",')
        .replace(/"target":\s*"\w+",/, '"target": "esnext",');
    
        await writeFile(`./${folder}/tsconfig.json`, tsconfigRawData);
        console.log(logSymbols.success,'Modified tsconfig.json successfuly!')
    }

    async run(){
        await Promise.all([this.initNpm(), this.initTsc()]);

        await this.installPackages();

        await Promise.all([this.editPackageJson(), this.editTsconfigJson()]);
    }
}


class SetupWithNodemon extends BaseSetup{

    installPackages(): Promise<ChildProcess> {
        return new Promise<ChildProcess>((resolve, reject) => {
            let npmSpinner = ora({spinner: 'bouncingBar',text: 'Installing the packages...'}).start();
    
            const installPack = spawn('npm', ['install', '-D' , 'typescript','@types/node', 'nodemon', 'ts-node'], { cwd: join('.',folder)});
    
            installPack.on("close", () => {
                npmSpinner.stopAndPersist({symbol: logSymbols.success, text: 'Installed the packages successfully'});
                resolve(installPack);
            });
    
            installPack.on("error", (err) => {
                npmSpinner.stopAndPersist({symbol: logSymbols.error, text: 'Failed to install the packages'});
                reject(err);
            })
        });
    }

    async editPackageJson(): Promise<void> {
        const packageJson= await readFile(join('.',folder,'package.json'), "utf-8");
        const jsonContent = JSON.parse(packageJson);
    
        jsonContent.scripts = {
            ...jsonContent.scripts,
            dev: "nodemon ./src/index.ts",
            start: "ts-node ./src/index.ts"
        }
    
        await writeFile(join('.',folder,'package.json'), JSON.stringify(jsonContent, null, 4));
        console.log(logSymbols.success,'Added the scripts successfuly!')
    }

    async createNodemonJson(): Promise<void>{
        const content = {
            watch: ["src"],
            ext: "ts",
            exec: "npm start"
        }

        await writeFile(join('.',folder,'nodemon.json'), JSON.stringify(content, null, 4));
        console.log(logSymbols.success,'Created nodemon.json successfuly!');
    }

    // Overriding the run method
    async run(){
        Promise.all([super.run(), this.createNodemonJson()]);
    }
}

class SetupWithTsNodedDev extends BaseSetup{
    
    installPackages(): Promise<ChildProcess> {
        return new Promise<ChildProcess>((resolve, reject) => {
            let npmSpinner = ora({spinner: 'bouncingBar',text: 'Installing the packages...'}).start();
    
            const installPack = spawn('npm', ['install', '-D' , 'typescript','@types/node', 'ts-node-dev'], {cwd: join('.',folder)});
    
            installPack.on("close", () => {
                npmSpinner.stopAndPersist({symbol: logSymbols.success, text: 'Installed the packages successfully'});
                resolve(installPack);
            });
    
            installPack.on("error", (err) => {
                npmSpinner.stopAndPersist({symbol: logSymbols.error, text: 'Failed to install the packages'});
                reject(err);
            })
        });
    }

    async editPackageJson(): Promise<void> {
        const packageJson= await readFile(join('.',folder,'package.json'), "utf-8");
        const jsonContent = JSON.parse(packageJson);
    
        jsonContent.scripts = {
            ...jsonContent.scripts,
            dev: "ts-node-dev --respawn --transpile-only server.ts ./src/index.ts",
        }
    
        await writeFile(join('.',folder,'package.json'), JSON.stringify(jsonContent, null, 4));
        console.log(logSymbols.success,'Added the scripts successfuly!')
    }
}

let folder: string;

(async () => {

    const folderNameInput = await inquirer.prompt({
        name: 'folderName',
        type: 'input',
        message: 'Enter the folder name',
        validate(value: string){
            const result = value.match(/^[a-zA-Z][a-zA-Z0-9]+$/);

            if (result)
                return true;
            
            return 'Please enter a valid folder name';
        }
    });

    folder = folderNameInput.folderName;

    spawnSync("mkdir", [join('.',folder)]);
    spawnSync("mkdir", [join('.',folder,'src')]);

    const setup = new SetupWithNodemon();
    await setup.run();

})();
