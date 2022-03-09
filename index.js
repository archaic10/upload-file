const exec = require('child_process').exec;
const fs = require('fs');
var base64 = require('base-64');
const { Octokit } = require("@octokit/core");
const core = require('@actions/core');
const githubToken = core.getInput('github-token');
const github = require('@actions/github')
async function run(){
    let filesChangelog = ["package.json", "changelog-temp.md"]
    filesChangelog.map(function(file) {
        console.log(file)
        let fileRead = fs.readFileSync(`./${file}`, 'utf8').toString();
        console.log(fileRead)
        let fileBase64 = base64.encode(fileRead);
        if(file == "changelog-temp.md")
            file = file.replace("changelog-temp.md","CHANGELOG.md")
        console.log("saida: ", file)
        uploadChangelog(fileBase64, `${file}`)
    })
}
    

async function getSHA(fileName){
    let actor = github.context.actor
    let repository = github.context.payload.repository.name
    let token = githubToken
    const octokit = new Octokit({ auth: token});
    return  octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: actor,
        repo: repository,
        path: fileName,
    }, (response)=>{
        return response.data.sha
    }).catch((error)=>{
        return error.status
    })
    

}
async function uploadChangelog(content, fileName){
    let actor = github.context.actor
    let repository = github.context.payload.repository.name
    let token = githubToken
    const octokit = new Octokit({ auth: token});        
    let param;
    let sha = await getSHA(fileName);        
    param = {
        owner: actor,
        repo: repository,
        path: fileName,
        message: 'ci: update changelog',
        content: content
    }

    console.log("Gerando arquivo: ", fileName)
    console.log("Conteúdo do arquivo: ", content)
    if(sha != 404 )
        param["sha"] = sha.data.sha;        
    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', param).then((res)=>{
        console.log({
            'statusCode':sha != 404 ? 200 : 201,
            'headers': {
                'Content-Type': 'application/json',
            },
            'body': {
                'message': sha != 404 ? 'Arquivo atualizado' : 'Arquivo criado',
            }
        })
        
    }).          
    catch(function(error){   
        console.log(error)
    })
}

run()