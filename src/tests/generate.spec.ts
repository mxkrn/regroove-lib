import { performance } from 'perf_hooks';
import LatentSpace from '../generate';
import { getRequestBody } from './fixtures.spec';

let requestBody = getRequestBody();

describe('ONNXModel', function() {
    it('builds and initializes methods and variables', async function() {
        let stbuild = performance.now();
        const latentSpace = await LatentSpace.build(requestBody.pattern, requestBody.numSamples, requestBody.noteDropout);
        console.log('time to build:', performance.now() - stbuild);
        let st = performance.now();
        await latentSpace.populate();
        console.log('time to populate:', performance.now() - st);
        let data = latentSpace.data;
        console.log(`Number of data points: ${Object.keys(data).length}`);
        console.log(`Example: ${data['0,0']}`)
    })
});