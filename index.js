const fs = require('fs')
var base64 = require('base-64')
const { Octokit } = require("@octokit/core")
const core = require('@actions/core')
const githubToken = core.getInput('github-token')
const github = require('@actions/github')

function run(){
    if(githubToken){
        let file = core.getInput('file')
        if (file){
            let fileRead = fs.readFileSync(`./${file}`, 'utf8').toString()
            let fileBase64 = base64.encode(fileRead)
            uploadGithub(fileBase64, `${file}`)
        }else{
            core.setFailed("Error: O parametro file não foi informado")
        }
    }else{
        core.setFailed("Error: O parametro github-token não foi informado")
    }
}
async function getSHA(actor, repository, fileName){
    
    const octokit = new Octokit({ auth: githubToken})
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

async function deleteOldFile(param, fileName, callback){
    
    const octokit = new Octokit({ auth: githubToken})
    param.message = 'ci: Delete changelog'
    await octokit.request('DELETE /repos/{owner}/{repo}/contents/{path}', param).then((res)=>{
        delete param.sha
        console.log("Deletando arquivo: ", fileName)
        if(callback == "recoveryShaConflict")
            uploadFileBase64(param, fileName) 
    }).catch((error)=>{
        console.log("Erro ao deletar arquivo: ", fileName)
        console.log("Erro ao deletar arquivo error: ", error)
        recoveryShaConflict(error, param, fileName, deleteOldFile.name)
    })
    param.message = `ci: Update ${fileName}`
}

async function loadContentBase64(fileName, content){
    let actor = github.context.actor
    console.log("context : ", github.context)
    let repository = github.context.payload.repository.name
    let param
    let sha = await getSHA(actor, repository, fileName)        
    param = {
        owner: actor,
        repo: repository,
        path: fileName,
        message: `ci: Update ${fileName}`,
        content: content,
        sha: sha
    }
    return param
}

async function recoveryShaConflict(error, param, fileName, callback){
    console.log("Recovery sha conflict: ", fileName)
    console.log("error recovery: ", error)
    console.log("error recovery data: ", error.response.data)
    let shaConflict = error.response.data.message
    shaConflict = shaConflict.split('expected').pop()
    shaConflict = shaConflict.trim()
    console.log("Sha recovery: ", shaConflict)
    param["sha"] = shaConflict
    if (callback == "uploadFileBase64")
        uploadFileBase64(param, fileName)
    if(callback == "deleteOldFile"){
        // deleteOldFile(param, fileName, recoveryShaConflict.name)
        uploadFileBase64(param, fileName)
    }
}

async function uploadFileBase64(param, fileName){
    
    const octokit = new Octokit({ auth: githubToken})
    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', param).then((res)=>{
        console.log("Uploda arquivo: ", fileName)
        let message = param.sha != 404 ? 'Arquivo atualizado' : 'Arquivo criado'
        console.log({
            'statusCode':param.sha != 404 ? 200 : 201,
            'headers': {
                'Content-Type': 'application/json',
            },
            'body': {
                'message': message,
            }
        })
        core.setOutput("success", message)
        
    }).catch(function(error){
        core.setFailed("Error ao commitar file: ",error)
        // recoveryShaConflict(error, param, fileName, uploadGithub.name)
    })
}

async function uploadGithub(content, fileName){
    let param = await loadContentBase64(fileName, content)    
    
    if(param.sha != 404 || fileName == 'package.json'){
        if(param.sha != 404)
            param["sha"] = param.sha.data.sha
        
        
        // deleteOldFile(param, fileName, uploadGithub.name)
    }
    uploadFileBase64(param, fileName)
}

run()