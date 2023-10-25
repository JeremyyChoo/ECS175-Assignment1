import { loadExternalFile } from './js/utils/utils.js'

/**
 * A class to load OBJ files from disk
 */
class OBJLoader {

    /**
     * Constructs the loader
     * 
     * @param {String} filename The full path to the model OBJ file on disk
     */
    constructor(filename) {
        this.filename = filename
    }

    /**
     * Loads the file from disk and parses the geometry
     * 
     * @returns {[Array<Number>, Array<Number>]} A tuple / list containing 1) the list of vertices and 2) the list of triangle indices
     */
    load() {
        // throw '"OBJLoader.load" not implemented' 

        // Load the file's contents
        let contents = loadExternalFile(this.filename)
        // Create lists for vertices and indices
        let vertices = []
        let indices = []

        // TODO: STEP 1
        // Parse the file's contents
        // You can loop through the file line-by-line by splitting the string at line breaks
        // contents.split('\n')
        let lines = contents.split('\n')

        // TODO: STEP 2
        // Process (or skip) each line based on its content and call the parsing functions to parse an entry
        // For vertices call OBJLoader.parseVertex
        // For faces call OBJLoader.parseFace
        lines.forEach(item=>{
            if(item?.indexOf('v ') === 0) {
                let _item = this.parseVertex(item)
                vertices.push(..._item)
            }
            if(item?.indexOf('f ') === 0) {
                let _faceList = this.parseFace(item)
                indices = [...indices, ..._faceList]
            }
        })

        // TODO: STEP 3
        // Vertex coordinates can be arbitrarily large or small
        // We want to normalize the vertex coordinates to fit within our [-1.0, 1.0]^3 box from the previous assignment
        // As a pre-processing step and to avoid complicated scaling transformations in the main app we perform normalization here
        // Determine the max and min extent of all the vertex coordinates and normalize each entry based on this finding
        let max = -Infinity;
        let min = Infinity;
        for (let i = 0; i < vertices.length; i += 3) {
            let x = vertices[i];
            let y = vertices[i + 1];
            let z = vertices[i + 2];
            max = Math.max(max, x, y, z);
            min = Math.min(min, x, y, z);
        }
        for (let i = 0; i < vertices.length; i++) {
            vertices[i] = (vertices[i] - min) / (max - min) * 2 - 1;
        }

        // TODO: HINT
        // Look up the JavaScript functions String.split, parseFloat, and parseInt 
        // You will need thim in your parsing functions

        // Return the tuple
        return [ vertices, indices ]
    }

    /**
     * Parses a single OBJ vertex entry given as a string
     * Call this function from OBJLoader.load()
     * 
     * @param {String} vertex_string String containing the vertex entry 'v {x} {y} {z}'
     * @returns {Array<Number>} A list containing the x, y, z coordinates of the vertex
     */
    parseVertex(vertex_string)
    {
        // TODO: Process the entry and parse numbers to float
        let _strList = vertex_string.split(' ')
        _strList.splice(0, 1)
        _strList = _strList.map(item=>parseFloat(item))
        return _strList
    }

    /**
     * Parses a single OBJ face entry given as a string
     * Face entries can refer to 3 or 4 elements making them triangle or quad faces
     * WebGL only supports triangle drawing, so we need to triangulate the entry if we find 4 indices
     * This is done using OBJLoader.triangulateFace()
     * 
     * Each index entry can have up to three components separated by '/' 
     * You need to grad the first component. The other ones are for textures and normals which will be treated later
     * Make sure to account for this fact.
     * 
     * Call this function from OBJLoader.load()
     * 
     * @param {String} face_string String containing the face entry 'f {v0}/{vt0}/{vn0} {v1}/{vt1}/{vn1} {v2}/{vt2}/{vn2} ({v3}/{vt3}/{vn3})'
     * @returns {Array<Number>} A list containing three indices defining a triangle
     */
    parseFace(face_string)
    {
        // throw '"OBJLoader.parseFace" not implemented'

        // TODO: Process the entry and parse numbers to ints
        // TODO: Don't forget to handle triangulation if quads are given
        // TODO: Process the entry and parse numbers to float
        let _faceList = face_string.split(' ')
        _faceList.splice(0, 1)
        let list = [..._faceList].map(part => parseInt(part.split(' ')?.[0]) - 1);
        if(list.length > 3) {
            list = this.triangulateFace(list)
        }
        return list
    }

    /**
     * Triangulates a face entry given as a list of 4 indices
     * Use these 4 indices to create indices for two separate triangles that share a side (2 vertices)
     * Return a new index list containing the triangulated indices
     * 
     * @param {Array<Number>} face The quad indices with 4 entries
     * @returns {Array<Number>} The newly created list containing triangulated indices
     */
    triangulateFace(face)
    {
        let _face = []
        let [face0,face1,face2, face3] = face
        _face = [face0, face1, face2, face0,face2, face3]
        return _face
        // throw '"OBJLoader.triangulateFace" not implemented'
        // TODO: Triangulate the face indices
    }
}

export {
    OBJLoader
}
