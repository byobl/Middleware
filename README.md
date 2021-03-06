## File Directory


```
. 
├── config
│       ├── connection-org1.json
│       └── winston.js
├── routes
│   └── lib
│   │   ├── enrollAdmin.js
│   │   ├── invoke.js
│   │   ├── query.js
│   │   ├── recoverApiKey.js
│   │   └── registerDomainAndUser.js
│   ├── swagger
│   │   └── swagger.yaml
│   ├── admin.js
│   ├── index.js
│   ├── user.js
│   └── rateLimit.js
├── views
│   └── index.ejs
├── wallets
├── app.js
├── package.json
└── apikey.json

```
 

## Dependencies

### Setting

| Name    | Version |
| ------- | ------- |
| Node.js | 10.22.1 |
| NPM     | 6.14.6  |


### Packages

| Package Name              | Version|
| ------------------------- | :----- |
| body-parser               | 1.19.0 |
| cors                      | 2.8.5  |
| crypto                    | 1.0.1  |
| ejs                       | 3.1.5  |
| express                   | 4.17.1 |
| express-rate-limit        | 5.1.3  |
| fabric-ca-client          | 2.2.3  |
| fabric-client             | 1.4.14 |
| fabric-network            | 1.4.14 |
| multer                    | 1.4.2  |
| pdf-parse                 | 1.1.1  |
| uuid-apikey               | 1.5.1  |
| winston                   | 3.3.3  |
| winston-daily-rotate-file | 4.5.0  |
| yamljs                    | 0.3.0  |



## Code

### Invoke.js

Fabric SDK를 활용하여, Fabirc Network에 블록을 생성하기 위한 코드

```javascript
  
'use strict';

const { FileSystemWallet, Gateway } = require('fabric-network');
const path = require('path');
const logger = require(process.cwd()+'/config/winston');
const ccpPath = path.resolve('./config', 'connection-org1.json');

async function invoke(fcn, args) {
    try {
        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);

        // Check to see if we've already enrolled the user.
        const adminExists = await wallet.exists('admin'); 
        if (!adminExists) {
            logger.warn('An identity for the admin user "admin" does not exist in the wallet\nRun the enrollAdmin.js application before retrying')
            return {status: 401};
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccpPath, { wallet, identity: 'admin', discovery: { enabled: true, asLocalhost: true } }); // asLocalhost should be disabled when deploy. 

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');

        // Get the contract from the network.
        const contract = network.getContract('sillock');
        logger.info(`invoke - ${args}`);

        // Submit the specified transaction.
        if( fcn == "registerVC" )
            await contract.submitTransaction('registerVC', args.key, args.issuerDID, args.controller, args.issuanceDate, args.expirationDate, args.sig, args.sigType, args.hashType, args.claim);
        else if( fcn == "registerDDo" )
            await contract.submitTransaction('registerDDo', args.key, args.pubkey, args.pubkeyType); 
        else if (fcn == "removeDDo") {
            await contract.submitTransaction('removeDDo', args);
            logger.info("Delete Success.");
        }

        // Disconnect from the gateway.
        await gateway.disconnect();

    } catch (error) {
        logger.error(`Failed to submit transaction: ${error}`);
        return {status: 400}
    }
}

module.exports = invoke;
```



### query.js

Fabric SDK를 활용하여, Fabirc Network에 Query를 하기 위한 코드

```javascript
'use strict';

const { FileSystemWallet, Gateway } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const logger = require(process.cwd()+'/config/winston');
const ccpPath = path.resolve('./config',  'connection-org1.json');

async function query(fcn, user, domain, args, apikey) {
    // API 사용량 측정
    try {
        const jsonFile = fs.readFileSync('./apikey.json', 'utf8');
        const jsonData = JSON.parse(jsonFile);

        if(jsonData[domain][user].apikey == apikey) {
            jsonData[domain][user].count++;
            try {
                fs.writeFileSync("./apikey.json", JSON.stringify(jsonData));
            } catch (error) {
                if(error) throw error;  
            }
        }
        else {
            logger.warn('Invalid User. The api-key is invalid');
            return {status:401};
        }
        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);

        // Check to see if we've already enrolled the user.
        const userWithDomain = `${user}.${domain}`;
        const userExists = await wallet.exists(userWithDomain);
        if (!userExists) {
            logger.warn(`An identity for the user ${userWithDomain} does not exist in the wallet\nRun the registerUser.js application before retrying`)
            return {status: 401};
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccpPath, { wallet, identity: userWithDomain, discovery: { enabled: true, asLocalhost: true } });
        
        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');
        
        // Get the contract from the network.
        const contract = network.getContract('sillock');
        
        // Evaluate the specified transaction.
        let result;
        if( fcn == "queryDDo" )
            result = await contract.evaluateTransaction('queryDDo', ...args);
        else if( fcn == "queryVC" )
            result = await contract.evaluateTransaction('queryDDo', ...args);

        logger.info(`Transaction has been evaluated, result is: ${result.toString()}`);

        return result.toString();
    } catch (error) {
        logger.error(`Failed to evaluate transaction: ${error}`);
        return {status: 404, error};
    }
}

module.exports = query
```


## API

### Admin

**POST /admin**

| 인자          | 타입 | 인자 유형 |
| ------------- | ---- | --------- |
| No parameters | -    | -         |

**POST /admin/domain**

| 인자   | 타입   | 인자 유형 |
| ------ | ------ | --------- |
| user   | string | body      |
| domain | string | body      |

**POST /admin/ddo**

| 인자 | 타입      | 인자 유형 |
| ---- | --------- | --------- |
| args | array[vc] | body      |

**PUT /admin/ddo**

| 인자 | 타입       | 인자 유형 |
| ---- | ---------- | --------- |
| args | array[DDo] | body      |

**DELETE /admin/ddo**

| 인자 | 타입   | 인자 유형 |
| ---- | ------ | --------- |
| args | string | body      |

**POST /admin/vc**

| 인자 | 타입      | 인자 유형 |
| ---- | --------- | --------- |
| args | array[VC] | body      |



### User

**GET /user/ddo/{did}**

| 인자   | 타입          | 인자 유형 |
| ------ | ------------- | --------- |
| user   | string        | query     |
| domain | string        | query     |
| did    | array[string] | path      |



**GET /user/vc/{did}**

| 인자   | 타입          | 인자 유형 |
| ------ | ------------- | --------- |
| user   | string        | query     |
| domain | string        | query     |
| did    | array[string] | path      |



**POST /user/apikey**

| 인자   | 타입   | 인자 유형 |
| ------ | ------ | --------- |
| user   | string | body      |
| domain | string | body      |
| uuid   | string | body      |



### Models

**VC**

| 인자           | 타입   | 설명                  |
| -------------- | ------ | --------------------- |
| key            | string | DID of Document       |
| issuerDID      | string | DID of Issuer         |
| controller     | string | DID of Controller     |
| issuanceDate   | string | Issuance Date         |
| expirationDate | string | Expiration Date       |
| sig            | string | Signature Value       |
| sigType        | string | The Type of Signature |
| hashType       | string | The Type of Hash      |
| claim          | string | The Hash of Claims    |

 

**DDo**

| 인자       | 타입   | 설명                   |
| ---------- | ------ | ---------------------- |
| key        | string | Key for Identifier     |
| pubkey     | string | Public Key             |
| pubkeyType | string | The Type of Public Key |



