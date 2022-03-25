# Action criation upload file

### This action send file to repository
```yml
uses: archaic10/upload-file@main
with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    file: changelog.md
```
