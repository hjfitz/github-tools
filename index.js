const debug = require('debug')('hjfitz:github-tools');
const { sleep, msleep } = require('sleep');


class GithubTools {
  constructor(token) {
    this.axios = require('axios').create({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.hellcat-preview+json',
      }
    });
    this.request = this.request.bind(this);
  }

  static sleep(reset) {
    const curEpoch = (new Date()).getTime();
    const diff =  reset - ~~(curEpoch/1000); // diff in seconds
    if (diff > 0) {
      debug(`about to hit the rate limit, sleeping for ${diff} seconds...`);
      sleep(diff);
    }
  }
  
  async request(url = '/', retries = 3, paginate = false, pageNo = 0, resultsAcc = []) {
    debug(`hitting page ${pageNo}`);
    debug(`hitting ${url}`);
    try {
      const r = await axios.get(`${url}?page=${pageNo}&per_page=100`);
      // extract data from fetch
      const { headers, data: resp }  = r;
      const  { "x-ratelimit-remaining": remain, "x-ratelimit-reset": reset, link } = headers;
      debug(remain, 'hits remaining');
      if (remain <= 10) gitSleep(headers['x-ratelimit-reset']);
      if(!link) return resp;
      const [p1, u, pn] = link.split(' ').map(r => r.trim());
      const allResults = [...resultsAcc, ...resp];
      // paginate or nah
      if (!paginate) return allResults;
      if (p1 !== pn) return gitRequest(url, retries, paginate, pageNo += 1, allResults);
      // we've hit the last page so make sure to return a thing!
      debug('returning all results');
      return allResults;
    } catch (err) {
      debug(err.response.headers['x-ratelimit-reset']);
      // retries = 0 is falsy
      if (retries) {
        const { "x-ratelimit-remaining": remain, "x-ratelimit-reset": reset, link } = err.response.headers;
        if (remain < 10) {
          gitSleep(err.response.headers['x-ratelimit-reset']);
          return gitRequest(url, retries - 1, paginate, pageNo, resultsAcc);
        }
        // return gitRequest(url, retries - 1, paginate, pageNo, ret);
        debug(`unhandled error with ${url}!`);
        return [];
      } else {
        throw new Error(err);
      }
    }
  }
}

const createClient = props => {
  if (!props.token) throw new Error('Missing PAT!');
  return new GithubClient(token);
}
