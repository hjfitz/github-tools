# GitHub Tools

A little TypeScript library because I'm too lazy to rewrite code

## Features:
- Auto pagination
- Waits if about to go over the API limit


## Usage:
```js
const gitTools = require('@hjfitz/github-tools');

const client = gitTools.createClient({ token: process.env.GITHUB_PAT });

const results = await client.request('/orgs/myCoolorg/users');

// use auto pagination
const paginatedResults = await client.request('/orgs/myCoolorg/users', 3, true);
```

## Request signature:
```js
client.request(url, retries, paginate, page number);
```
* `url: string` - the API url to hit
* `retries: number` - the maximum number of retries to attempt (default: 3)
* `paginate: boolean` - whether to auto-paginate (default: false)
* `page number: number` - which page to start on (default: 0)