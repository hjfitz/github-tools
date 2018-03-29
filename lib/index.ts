import debug from 'debug'; //('hjfitz:github-tools');
import { sleep, msleep } from 'sleep';
import axios, { AxiosStatic, AxiosInstance, AxiosResponse } from 'axios';

interface GithubClientProperties {
  token: string,
};

class GithubClient {
  axios: AxiosInstance;
  debug: debug.IDebugger;

  constructor(token: string) {
    this.axios = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.hellcat-preview+json',
      }
    });
    this.debug = debug('hjfitz:github-tools');
    this.request = this.request.bind(this);
  }

  static sleep(reset: number): void {
    const curEpoch: number = (new Date()).getTime();
    const diff: number =  reset - ~~(curEpoch/1000); // diff in seconds
    if (diff > 0) {
      debug(`about to hit the rate limit, sleeping for ${diff} seconds...`);
      sleep(diff);
    }
  }
  
  async request(url: string = '/', retries: number = 3, paginate: boolean = false, pageNo: number = 0, resultsAcc: object[] = []): Promise<object[]> {
    debug(`hitting page ${pageNo}`);
    debug(`hitting ${url}`);
    try {
      const r: AxiosResponse<any> = await axios.get(`${url}?page=${pageNo}&per_page=100`);
      // extract data from fetch
      const { headers, data: resp }  = r;
      const  { "x-ratelimit-remaining": remain, "x-ratelimit-reset": reset, link } = headers;
      debug(`${remain} API Requests remaining`);
      if (remain <= 10) GithubClient.sleep(headers['x-ratelimit-reset']);
      if(!link) return resp;
      const [p1, u, pn] = link.split(' ').map((r: string) => r.trim());
      const allResults: object[] = [...resultsAcc, ...resp];
      // paginate or nah
      if (!paginate) return allResults;
      if (p1 !== pn) return this.request(url, retries, paginate, pageNo += 1, allResults);
      // we've hit the last page so make sure to return a thing!
      debug('returning all results');
      return allResults;
    } catch (err) {
      debug(err.response.headers['x-ratelimit-reset']);
      // retries = 0 is falsy
      if (retries) {
        const { "x-ratelimit-remaining": remain, "x-ratelimit-reset": reset, link } = err.response.headers;
        if (remain < 10) {
          GithubClient.sleep(err.response.headers['x-ratelimit-reset']);
          return this.request(url, retries - 1, paginate, pageNo, resultsAcc);
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

export default function createClient(props: GithubClientProperties): GithubClient {
  if (!props.token) throw new Error('Missing PAT!');
  return new GithubClient(props.token);
}
