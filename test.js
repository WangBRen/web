// import { createClient } from "webdav/web"
const { createClient } = require("webdav");
 
const client = createClient(
    "https://dav.jianguoyun.com/dav/",
    {
        username: "18624854424@163.com",
        password: "atymw9v66mbxn9ub"
    }
);
 
// Get directory contents
async function test() {
    console.log('test');
    const directoryItems = await client.getDirectoryContents("/我的坚果云");
    console.log(directoryItems)
}

test()
