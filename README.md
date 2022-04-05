# Action upload file

### This action sends the file to the repository, if the uploaded file exists the action will update the file, if it does not exist the action will create the file

```yml
uses: archaic10/upload-file@main
with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    file: changelog.md
```
