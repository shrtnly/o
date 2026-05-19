import fs from 'fs';

function readGLB(filePath) {
    const buffer = fs.readFileSync(filePath);
    const magic = buffer.readUInt32LE(0);
    if (magic !== 0x46546C67) {
        console.log('Not a valid GLB');
        return;
    }
    
    const version = buffer.readUInt32LE(4);
    const length = buffer.readUInt32LE(8);
    
    let offset = 12;
    let jsonChunkLength = buffer.readUInt32LE(offset);
    let jsonChunkType = buffer.readUInt32LE(offset + 4);
    
    if (jsonChunkType !== 0x4E4F534A) {
        console.log('First chunk is not JSON');
        return;
    }
    
    const jsonBuffer = buffer.slice(offset + 8, offset + 8 + jsonChunkLength);
    const json = JSON.parse(jsonBuffer.toString('utf8'));
    
    console.log('Images:', json.images ? json.images.length : 0);
    console.log('Textures:', json.textures ? json.textures.length : 0);
    console.log('Materials:', json.materials ? json.materials.length : 0);
    if (json.materials) {
        console.log('First material:', JSON.stringify(json.materials[0], null, 2));
    }
}

readGLB('D:\\O-sekha\\O-sekha\\public\\models\\animated_bee.glb');
