import {Vector3, Matrix3} from 'math-ds'

function dicotomicSearch(k, v, i_begin, i_last,) {
    let i_mid = Math.floor((i_begin + i_last ) /2);
    if (v[i_begin] <= k && ((i_begin + 1== v.length)  ||  v[i_begin +1] >= k))
    {
        return i_begin
    }
    else if (v[i_mid] < k) {
        return dicotomicSearch(k, v, i_mid, i_last)
    }
    else  {
        return dicotomicSearch(k, v, i_begin, i_mid)

    }
}

class WeightedSample {
    constructor(weights) {
        this.acumWeights = [];
        this.totalWeight = 0
        for (let i = 0; i < weights.length; i++) {
            this.acumWeights.push(this.totalWeight);
            this.totalWeight += weights[i];
        }
    }

    getSample() {
        let r = Math.random() * this.totalWeight;
        return dicotomicSearch(r, this.acumWeights, 0, this.acumWeights.length)
    }
};


class MeshSampler {
    constructor(coordinates, triangles) {
        this.triangles = triangles;
        this.coordinates = coordinates
        // COMPUTE mean
        let mean = new Vector3(0,0,0);
        for (let i = 0; i < this.coordinates.length; i++) {
            mean.addScaledVector(this.coordinates[i], 1 /this.coordinates.length)
        }

        this.absoluteVolumes = [];
        this.signedVolumes = [];
        for (let i = 0; i < this.triangles.length; i++) {
            let m = new Matrix3();
            let t = this.triangles[i]
            m.set(
                this.coordinates[t[0]].x, this.coordinates[t[0]].y, this.coordinates[t[0]].z, 
                this.coordinates[t[1]].x, this.coordinates[t[1]].y, this.coordinates[t[1]].z,
                this.coordinates[t[2]].x, this.coordinates[t[2]].y, this.coordinates[t[2]].z,)
            let vol = m.determinant()/6;
            this.absoluteVolumes.push(Math.abs(vol));
            this.signedVolumes.push(vol);
        }

        this.sampler = new WeightedSample(this.absoluteVolumes)
    }
    getSample(){ 
        let i = this.sampler.getSample();
        let r1 = - Math.log(Math.random());
        let r2 = - Math.log(Math.random());
        let r3 = - Math.log(Math.random());
        let R = r1 + r2 + r3;
        r1 /= R;
        r2 /= R;
        r3 /= R;
        var p = new Vector3(0,0,0);
        let t = this.triangles[i]
        p.addScaledVector(this.coordinates[t[0]] , r1).addScaledVector(this.coordinates[t[1]], r2).addScaledVector(this.coordinates[t[2]], r3)
        return {point :p , sign : Math.sign(this.signedVolumes[i])}
    }
}

export default MeshSampler;