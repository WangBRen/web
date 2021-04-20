const { createClient } = require("webdav");
 
const client = createClient(
    "https://dav.jianguoyun.com/dav/",
    {
        username: "18624854424@163.com",
        password: "atymw9v66mbxn9ub"
    }
);
 
// Get directory contents
async function getFile() {
    console.log('Test');
    const directoryItems = await client.getDirectoryContents("/");
    console.log(directoryItems)
}

getFile()
