import assert from "assert";
import { Tensor } from "onnxruntime";

type TensorType = Array<Array<Array<number>>>;
type MatrixType = Array<Array<number>>;
type FLOAT32 = "float32";

function transpose2d(matrix: MatrixType): MatrixType {
  return matrix[0].map((_, i) => matrix.map(row => row[i]));
}
  
export { transpose2d, TensorType, MatrixType, FLOAT32 };


interface IPattern extends Pattern {
    concatenate(pattern: Pattern, axis: number): Pattern;
    transpose(): TensorType;
    tensor(): TensorType;
    view(dims: Array<number>): TensorType;
}

class BasePattern extends Tensor<FLOAT32> {
    batchSize: number;
    sequenceLength: number;
    channels: number;
    /**
     * Pattern inherits from Tensor and implements rigid 
     * dimensions and extra utility methods
     * @param data Float32Array containing pattern data
     * @param dims Target tensor dimensions
     */
    constructor(data: Float32Array | TensorType, dims: Array<number>) {
        let d: Float32Array;
        if (data instanceof Float32Array) {
            d = data;
        } else {
            d = Float32Array.from(data.reduce((acc, val) => acc.concat(val), []).reduce((acc, val) => acc.concat(val), []));
        }
        super("float32", d, dims);
        this.batchSize = dims[0];
        this.sequenceLength = dims[1];
        this.channels = dims[2];
    }
}

// TODO: Error handling
class Pattern extends BasePattern implements IPattern {
    get shape(): readonly number[] {
        return this.dims;
    }
    get length(): number {
        return this.data.length;
    }
    static empty(dims: readonly number[]): TensorType {
        assert.ok(dims.length == 3);
        return Array.from({length: dims[0]}, _ => {
            return Array.from({length: dims[1]}, _ => [])
        });
    }
    static zeros(dims: readonly number[]): TensorType {
        assert.ok(dims.length == 3);
        return Array.from({length: dims[0]}, _ => {
            return Array.from({length: dims[1]}, _ => {
                return Array.from({length: dims[2]}, _ => 0.)
            })
        });
    }
    tensor(): TensorType {
        /**
         * Returns the pattern as a TensorType
         */
        const arr = Pattern.empty(this.dims);
        let idx = 0;
        for (let b = 0; b < this.batchSize; b++) {
            for (let s = 0; s < this.sequenceLength; s++) {
                for (let c = 0; c < this.channels; c++) {
                    arr[b][s][c] = this.data[idx];
                    idx += 1;
                }
            }
        }
        return arr;
    }
    view(dims: readonly number[]): TensorType {
        /**
         * View the pattern with a different dimensionality
         */
        const length = dims[0]*dims[1]*dims[2];
        try {
            assert.ok(this.length == length);
        } catch {
            throw new Error(`${dims} do not match tensor size ${this.length}`)
        }
        
        const arr = Pattern.empty(dims);
        let idx = 0;
        for (let b = 0; b < dims[0]; b++) {
            for (let j = 0; j < dims[1]; j++) {
                for (let k = 0; k < dims[2]; k++) {
                    arr[b][j][k] = this.data[idx];
                    idx += 1;
                }
            }
        }
        return arr;
    }
    transpose(): TensorType {
        /**
         * Strictly transposes this.dims[1] <-> this.dims[2]
         */
        const tensor = this.tensor();
        const tensorT = Pattern.empty(this.dims);
        for (let i = 0; i < tensor.length; i++) {
            tensorT[i] = transpose2d(tensor[i])
        }
        return tensorT;
    }
    concatenate(pattern: Pattern, axis: number): Pattern {
        /**
         * Concatenates two patterns along a given axis
         */
        assert.ok(axis >= 0, "Negative array indexing not allowed")
        let cat_tensor = this.tensor();
        const tensor = pattern.tensor();
        const dims = [-1, -1, -1];

        if (axis == 0) {
            
            dims[0] = this.dims[0] + tensor.length;
            dims[1] = this.dims[1];
            dims[2] = this.dims[2];
            cat_tensor = cat_tensor.concat(tensor);

        } else if (axis == 1) {

            dims[0] = this.dims[0];
            dims[1] = this.dims[1] + tensor[0].length;
            dims[2] = this.dims[2];
            for (let b = 0; b < this.batchSize; b++) {
                cat_tensor[b] = cat_tensor[b].concat(tensor[b]);
            }

        } else if (axis == 2) {

            dims[0] = this.dims[0];
            dims[1] = this.dims[1];
            dims[2] = this.dims[2] + tensor[0][0].length;
            for (let b = 0; b < this.batchSize; b++){
                for (let s = 0; s < this.sequenceLength; s++) {
                    cat_tensor[b][s] = cat_tensor[b][s].concat(tensor[b][s])
                }
            }
        }
        return new Pattern(cat_tensor, dims);
    }
}

export default Pattern;
