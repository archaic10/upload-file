const fs = require('fs');
var base64 = require('base-64');
const { Octokit } = require("@octokit/core");
const core = require('@actions/core');
const githubToken = core.getInput('github-token');
const github = require('@actions/github')

async function run(){
    let filesChangelog = ["package.json", "CHANGELOG.md"]
    filesChangelog.map(function(file) {        
        let fileRead = fs.readFileSync(`./${file}`, 'utf8').toString();
        let fileBase64 = base64.encode(fileRead);
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
        message: `ci: Update ${fileName}`,
        content: content
    }

    if(sha != 404 ){
        param["sha"] = sha.data.sha;
        console.log(`data ${fileName} : ${sha.data.sha}`)
        if(fileName == 'CHANGELOG.md'){
            param.message = 'ci: Delete changelog'
            await octokit.request('DELETE /repos/{owner}/{repo}/contents/{path}', param).then((res)=>{
                delete param.sha;
                console.log("Deletando arquivo: ", fileName)
            }).catch((error)=>{
                core.setFailed("Erro ao deletar arquivo: ", fileName)
            })
            param.message = 'ci: Update changelog'
        }
    }
    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', param).then((res)=>{
        console.log("Uploda arquivo: ", fileName)
        console.log({
            'statusCode':sha != 404 ? 200 : 201,
            'headers': {
                'Content-Type': 'application/json',
            },
            'body': {
                'message': sha != 404 ? 'Arquivo atualizado' : 'Arquivo criado',
            }
        })
        
    }).catch(function(error){
        console.log("Error ao commitar file: ",error);
    })
}

run()