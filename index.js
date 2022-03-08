const exec = require('child_process').exec;
const fs = require('fs');
var base64 = require('base-64');
const { Octokit } = require("@octokit/core");
const core = require('@actions/core');
const githubToken = core.getInput('github-token');
const github = require('@actions/github')
async function run(){
    exec('npm install auto-changelog --save-dev && auto-changelog -p',  function(err, stdout, stderr) {
        if(stderr){
            console.log("err: ", err)
            console.log("stderr: ", stderr)
            core.setFailed("Error: Não foi possível gerar o changelog");
        }else{
            console.log("stdout: ", stdout)
            core.setOutput("changelog", "changelog gerado com sucesso");
            let file = fs.readFileSync('./CHANGELOG.md', 'utf8').toString();
            let fileBase64 = base64.encode(file);        
            uploadChangelog(fileBase64, 'CHANGELOG.md')
        }
        
    })
    
}
async function getSHA(){
    let actor = github.Context.actor
    let repository = github.Context.payload.repository.name
    let token = githubToken
    const octokit = new Octokit({ auth: token});
    return  octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: actor,
        repo: repository,
        path: 'CHANGELOG.md'
    }, (response)=>{
        return response.data.sha
    }).catch((error)=>{
        return error.status
    })
    

}
async function uploadChangelog(content, fileName){
    let actor = github.Context.actor
    let repository = github.payload.repository.name
    let token = githubToken
    const octokit = new Octokit({ auth: token});        
    let param;
    let sha = await getSHA();        
    param = {
        owner: actor,
        repo: repository,
        path: 'CHANGELOG.md',
        message: 'ci: update changelog',
        content: content
    }
    
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