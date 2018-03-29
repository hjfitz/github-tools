"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = __importDefault(require("debug")); //('hjfitz:github-tools');
const sleep_1 = require("sleep");
const axios_1 = __importDefault(require("axios"));
;
class GithubClient {
    constructor(token) {
        this.axios = axios_1.default.create({
            baseURL: 'https://api.github.com',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.hellcat-preview+json',
            }
        });
        this.debug = debug_1.default('hjfitz:github-tools');
        this.request = this.request.bind(this);
    }
    static sleep(reset) {
        const curEpoch = (new Date()).getTime();
        const diff = reset - ~~(curEpoch / 1000); // diff in seconds
        if (diff > 0) {
            debug_1.default(`about to hit the rate limit, sleeping for ${diff} seconds...`);
            sleep_1.sleep(diff);
        }
    }
    request(url = '/', retries = 3, paginate = false, pageNo = 0, resultsAcc = []) {
        return __awaiter(this, void 0, void 0, function* () {
            debug_1.default(`hitting page ${pageNo}`);
            debug_1.default(`hitting ${url}`);
            try {
                const r = yield axios_1.default.get(`${url}?page=${pageNo}&per_page=100`);
                // extract data from fetch
                const { headers, data: resp } = r;
                const { "x-ratelimit-remaining": remain, "x-ratelimit-reset": reset, link } = headers;
                debug_1.default(`${remain} API Requests remaining`);
                if (remain <= 10)
                    GithubClient.sleep(headers['x-ratelimit-reset']);
                if (!link)
                    return resp;
                const [p1, u, pn] = link.split(' ').map((r) => r.trim());
                const allResults = [...resultsAcc, ...resp];
                // paginate or nah
                if (!paginate)
                    return allResults;
                if (p1 !== pn)
                    return this.request(url, retries, paginate, pageNo += 1, allResults);
                // we've hit the last page so make sure to return a thing!
                debug_1.default('returning all results');
                return allResults;
            }
            catch (err) {
                debug_1.default(err.response.headers['x-ratelimit-reset']);
                // retries = 0 is falsy
                if (retries) {
                    const { "x-ratelimit-remaining": remain, "x-ratelimit-reset": reset, link } = err.response.headers;
                    if (remain < 10) {
                        GithubClient.sleep(err.response.headers['x-ratelimit-reset']);
                        return this.request(url, retries - 1, paginate, pageNo, resultsAcc);
                    }
                    // return gitRequest(url, retries - 1, paginate, pageNo, ret);
                    debug_1.default(`unhandled error with ${url}!`);
                    return [];
                }
                else {
                    throw new Error(err);
                }
            }
        });
    }
}
function createClient(props) {
    if (!props.token)
        throw new Error('Missing PAT!');
    return new GithubClient(props.token);
}
exports.default = createClient;
//# sourceMappingURL=index.js.map