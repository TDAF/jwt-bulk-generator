/**
 * @license
 * Copyright 2015 Telefónica Investigación y Desarrollo, S.A.U
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var fs = require('fs'),
    uuid = require('uuid'),
    extend = require('node.extend');

function instantiateTemplate(object) {
  for (var key in object) {
    var value = object[key];
    if (value === '{{{uuid}}}') {
      object[key] = uuid.v4();
    } else if (value === '{{{phone}}}') {
      object[key] = argv.prefix + randomInt(0,999999999).toString();
    }
  }
}

function randomInt (low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

var argv = require('yargs')
    .option('n', {
      alias: 'number',
      describe: 'Number of JWTs to generate'
    })
    .option('p', {
      alias: 'payloadFile',
      describe: 'File where the input token payload is stored'
    })
    .option('k', {
      alias: 'keyFile',
      describe: 'File where the key is stored'
    })
    .option('o', {
      alias: 'outputFile',
      describe: 'File where the generated tokens will be stored'
    })
    .option('e', {
        alias: 'expiration',
        describe: 'Expiration for the JWTs, in seconds from now'
    })
    .option('prefix', {
      default: 'tel:+34',
      describe: 'Prefix for phone numbers in jwt (e.g. tel:+34)'
    })
    .array('r')
    .requiresArg(['n', 'p', 'k', 'o', 'e', 'prefix'])
    .argv;

var config = {expiration: argv.e};
var jwtUtils = require('jwt-utils')(config);

try {
  var keyInfo = JSON.parse(fs.readFileSync(argv.k));
} catch (err) {
  console.log('ERROR reading key file: ' + err);
  process.exit(2);
}

var headerTemplate = {
  kid: keyInfo.kid,
  alg: 'dir',
  enc: 'A256CBC-HS512',
  corr: '{{{uuid}}}'
}

try {
  var payloadTemplate = JSON.parse(fs.readFileSync(argv.p));
} catch (err) {
  console.log('ERROR reading payload file: ' + err);
  process.exit(1);
}

for (var i = 0; i < argv.n; i++) {
  var header = extend(true, {}, headerTemplate);
  var payload = extend(true, {}, payloadTemplate);
  instantiateTemplate(header);
  instantiateTemplate(payload);
  payload.iat = Math.floor(new Date() / 1000);
  jwtUtils.buildJWTEncrypted(payload, header, keyInfo.keyValue, keyInfo.keyValue, function(err, token) {
      if (!err) {
        fs.appendFileSync(argv.o, token + '\n');
      } else {
        console.log(err);
      }
  })
}
