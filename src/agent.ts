import { RequestInit } from "node-fetch";
import * as http from "http";
import * as https from "https";

const httpsAgent = new https.Agent({
    keepAlive: true
});

export const options : RequestInit = {
    
};