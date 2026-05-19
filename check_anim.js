import fs from 'fs';
import * as THREE from 'three';

// Well, we can't easily load GLB in node without three examples or gltf-pipeline.
// Let's just use a simple regex on the JSON chunk we extracted earlier.
function checkAnim(filePath) {
    const buffer = fs.readFileSync(filePath);
    let offset = 12;
    let jsonChunkLength = buffer.readUInt32LE(offset);
    const jsonBuffer = buffer.slice(offset + 8, offset + 8 + jsonChunkLength);
    const json = JSON.parse(jsonBuffer.toString('utf8'));
    
    if (json.animations) {
        json.animations.forEach((anim, i) => {
            console.log(`Animation ${i}: ${anim.name}`);
            anim.channels.forEach((ch, j) => {
                const nodeName = json.nodes[ch.target.node]?.name || ch.target.node;
                console.log(`  Channel ${j}: Node ${nodeName}, Path: ${ch.target.path}`);
            });
        });
    }
}
checkAnim('D:\\O-sekha\\O-sekha\\public\\models\\animated_bee.glb');
