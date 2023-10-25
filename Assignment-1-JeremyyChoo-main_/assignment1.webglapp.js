
import { hex2rgb, deg2rad, loadExternalFile } from './js/utils/utils.js'
import Input from './js/input/input.js'
import * as mat4 from './js/lib/glmatrix/mat4.js'
import * as vec3 from './js/lib/glmatrix/vec3.js'
import * as quat4 from './js/lib/glmatrix/quat.js'
import { Box } from './js/app/object3d.js'

import { Scene, SceneNode } from './assignment1.scene.js'

/**
 * @Class
 * WebGlApp that will call basic GL functions, manage camera settings, transformations and scenes, and take care of rendering them
 * 
 */
class WebGlApp 
{
    /**
     * Initializes the app with a box, and a scene, view, and projection matrices
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Shader} shader The shader to be used to draw the object
     * @param {AppState} app_state The state of the UI
     */
    constructor( gl, shader, app_state )
    {
        // Set GL flags
        this.setGlFlags( gl )

        // Store the shader
        this.shader = shader
        
        // Create a box instance
        this.box = new Box( gl, shader )

        // Declare a variable to hold a Scene
        // Scene files can be loaded through the UI (see below)
        this.scene = null

        // Bind a callback to the file dialog in the UI that loads a scene file
        app_state.onOpen3DScene((filename) => {
            let scene_config = JSON.parse(loadExternalFile(`./scenes/${filename}`))
            this.scene = new Scene(scene_config, gl, shader)
            return this.scene
        })

        // Create the view matrix
        this.eye     =   [2.0, 0.5, -2.0]
        this.center  =   [0, 0, 0]
       
        this.forward =   null
        this.right   =   null
        this.up      =   null

        // Forward, Right, and Up are initialized based on Eye and Center
        this.updateViewSpaceVectors()
        let _view = mat4.create()
        this.view = mat4.lookAt(_view, this.eye, this.center, this.up)

        // Create the projection matrix
        // TODO: Create values the projection matrix
        // TODO: The projection should have a vertical field of view of 60
        // TODO: It should have an 16:9 aspect rotation
        // TODO: Define appropriate values for the near and far plane distance so that the whole scene is visible
         // TODO: Create a projection matrix using glMatrix with the values defined above 
        let _projection = mat4.create()
        this.projection = mat4.perspectiveZO(_projection, 60*Math.PI/180, 16/9,0.5, 2000)

        // Use the shader's setUniform4x4f function to pass the matrices
        this.shader.use()
        this.shader.setUniform4x4f('u_v', this.view)
        this.shader.setUniform4x4f('u_p', this.projection)
        this.shader.unuse()

    }  

    /**
     * Sets up GL flags
     * In this assignment we are drawing 3D data, so we need to enable the flag 
     * for depth testing. This will prevent from geometry that is occluded by other 
     * geometry from 'shining through' (i.e. being wrongly drawn on top of closer geomentry)
     * 
     * Look into gl.enable() and gl.DEPTH_TEST to learn about this topic
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     */
    setGlFlags( gl ) {

        // Enable depth test
        gl.enable(gl.DEPTH_TEST)

    }

    /**
     * Sets the viewport of the canvas to fill the whole available space so we draw to the whole canvas
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Number} width 
     * @param {Number} height 
     */
    setViewport( gl, width, height )
    {
        gl.viewport( 0, 0, width, height )
    }

    /**
     * Clears the canvas color
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     */
    clearCanvas( gl )
    {
        gl.clearColor(...hex2rgb('#000000'), 1.0)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    }
    
    /**
     * Updates components of this app
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {AppState} app_state The state of the UI
     * @param {Number} delta_time The time in seconds since the last frame (floating point number)
     */
    update( gl, app_state, delta_time ) 
    {
        // Draw Mode

        if (this.scene != null) {
            let canvas = document.getElementById('canvas')

            this.setViewport(gl, canvas.width, canvas.height)
            this.clearCanvas(gl)
            // // Bind vertex array object
            gl.bindVertexArray( this.scene.scenegraph.obj3d.vertex_array_object )
    
            // // Bind index buffer
            gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.scene.scenegraph.obj3d.index_buffer )

            this.scene.scenegraph.obj3d.shader.use( )
            gl.drawElements( this.scene.scenegraph.obj3d.draw_mode, this.scene.scenegraph.obj3d.indices.length,  gl.UNSIGNED_SHORT, 0, )
            gl.bindVertexArray( null )
            gl.bindBuffer( gl.ARRAY_BUFFER, null )
            gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null )
            this.scene.scenegraph.obj3d.shader.unuse( )
            // TODO: Get the draw mode (gl.TRIANGLES, gl.POINTS) based on the Draw Mode UI state
            // TODO: Iterate through this.scene's SceneNodes (there's a getter for that)
            this.scene.scenegraph.obj3d.setDrawMode(app_state.getState('Draw Mode') === 'Triangles' ? gl.TRIANGLES: gl.POINTS)
        }

        // Control
        switch(app_state.getState('Control')) {
            case 'Camera':
                this.updateCamera( delta_time )
                break
            case 'Scene Node':
                // Only do this if a scene is loaded
                if (this.scene == null)
                    break
                // Get the currently selected scene node from the UI
                let scene_node = this.scene.getNode( app_state.getState('Select Scene Node') )
                this.updateSceneNode( scene_node, delta_time )
                break
        }
    }

    /**
     * Update the Forward, Right, and Up vector according to changes in the 
     * camera position (Eye) or the center of focus (Center)
     */
    updateViewSpaceVectors( ) {
        this.forward = vec3.normalize(vec3.create(), vec3.sub(vec3.create(), this.eye, this.center))
        this.right = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), [0,1,0], this.forward))
        this.up = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), this.forward, this.right))
    }

    /**
     * Update the camera view based on user input and the arcball viewing model
     * 
     * Supports the following interactions:
     * 1) Left Mouse Button - Rotate the view's center
     * 2) Middle Mouse Button or Space+Left Mouse Button - Pan the view relative view-space
     * 3) Right Mouse Button - Zoom towards or away from the view's center
     * 
     * @param {Number} delta_time The time in seconds since the last frame (floating point number)
     */
    updateCamera( delta_time ) {
        let view_dirty = false

        // Control - Zoom
        if (Input.isMouseDown(2)) {
            // throw '"WebGlApp.updateCamera" not complete'

            let scaleVec = vec3.create();
            vec3.set(scaleVec, ...this.eye);
            vec3.scale(scaleVec, scaleVec, 1.01 *delta_time/(delta_time*1.03))
            this.eye = scaleVec
            // TODO: Implement the zoom feature
            // TODO: Transform this.eye - move it closer to this.center by a certain amount along the Forward axis
            // TODO: Use Input.getMouseDy() and delta_time to determine the amount of change

            // Set dirty flag to trigger view matrix updates
            view_dirty = true
        }

        // Control - Rotate
        if (Input.isMouseDown(0) && !Input.isKeyDown(' ')) {
            // throw '"WebGlApp.updateCamera" not complete'
            // TODO: Implement the arcball rotation
            // TODO: Transform this.eye - rotate it around the up axis first, then around the right axis
            // TODO: Use Input.getMouseDx(), Input.getMouseDy(), and delta_time to determine the amount of change
            let dx = Input.getMouseDx()
            let dy = Input.getMouseDy()
            if(dx !== 0 || dy !== 0) {
                let rotateVec = vec3.create();
                vec3.set(rotateVec,...this.eye)
                if(dx !==0) {
                    vec3.rotateZ(rotateVec, rotateVec, [0,0,1], delta_time*40*dx*Math.PI/360)
                }
                if(dy !==0) {
                    vec3.rotateX(rotateVec, rotateVec, [1,0,0], delta_time*dy*40*Math.PI/360)
                }
                this.eye = rotateVec
                view_dirty = true
            }else {
                // Set dirty flag to trigger view matrix updates
                view_dirty = false
            }
        }

        // Control - Pan
        if (Input.isMouseDown(1) || (Input.isMouseDown(0) && Input.isKeyDown(' '))) {
            // throw '"WebGlApp.updateCamera" not complete'
            let dx = Input.getMouseDx()
            let dy = Input.getMouseDy()
            if(dx !== 0 || dy !== 0) {
                let eyeVec = vec3.set(vec3.create(),...this.eye)
                let centerVec = vec3.set(vec3.create(),...[dx, dy, 0])
                if(dx !==0) {
                    vec3.rotateZ(eyeVec, eyeVec, [0,0,1], delta_time*40*dx*Math.PI/360)
                    vec3.rotateZ(centerVec, centerVec, [0,0,1], delta_time*40*dx*Math.PI/360)
                }
                if(dy !==0) {
                    vec3.rotateX(eyeVec, eyeVec, [1,0,0], delta_time*dy*40*Math.PI/360)
                    vec3.rotateX(centerVec, centerVec, [1,0,0], delta_time*40*dx*Math.PI/360)
                }
                this.eye = eyeVec
                this.center = centerVec
                // this.center = [this.center[0]+dx*delta_time*10, this.center[1], this.center[2]+dy*delta_time*10]
                console.log(dx, dy, this.eye, this.center);
                view_dirty = true
            }else {
                // Set dirty flag to trigger view matrix updates
                view_dirty = false
            }
            // TODO: Implement the pan interaction
            // TODO: Transform this.eye and this.center to move the camera and the center of attention at the same time
            // TODO: For this, use the view-aligned up and right axes and use those to determine the direction of translation
            // TODO: Use Input.getMouseDx(), Input.getMouseDy(), and delta_time to determine the amount of change
        }

        // Update view matrix if needed
        if (view_dirty) {
            // throw '"WebGlApp.updateCamera" not complete'

            // Update Forward, Right, and Up vectors
            this.updateViewSpaceVectors()

            // TODO: Recompute this.view based on updated values for this.eye (and this.center)
            this.view = null

            this.view = mat4.lookAt(mat4.create(), this.eye, this.center, this.up)

            this.shader.use()
            this.shader.setUniform4x4f('u_v', this.view)
            this.shader.unuse()

            // TODO: Update the view matrix in the shader using setUniform4x4f and the new this.view
            // TODO: Don't forget to 'use' the shader first to set it active in WebGL state
        }
    }

    /**
     * Update a SceneNode's local transformation
     * 
     * Supports the following interactions:
     * 1) Left Mouse Button - Rotate the node relative to the view along the Up and Right axes
     * 2) Middle Mouse Button or Space+Left Mouse Button - Translate the node relative to the view along the Up and Right axes
     * 3) Right Mouse Button - Scales the node around it's local center
     * 
     * @param {SceneNode} node The SceneNode to manipulate
     * @param {Number} delta_time The time in seconds since the last frame (floating point number)
     */
    updateSceneNode( node, delta_time ) {
        let node_dirty = false

        let translation = mat4.create()
        let rotation = mat4.create()
        let scale = mat4.create()

        // Control - Scale
        if (Input.isMouseDown(2)) {
            // throw '"WebGlApp.updateSceneNode" not complete'

            // TODO: Create a scaling matrix to scale the node
            // TODO: Use Input.getMouseDy() and delta_time to determine the amount of change
            // TODO: Store the matrix in variable 'scale'

            mat4.scale(scale, scale, [0.99, 0.99, 0.99])

            // Set dirty flag to trigger model matrix updates
            node_dirty = true
        }

        // Control - Rotate
        if (Input.isMouseDown(0) && !Input.isKeyDown(' ')) {
            // throw '"WebGlApp.updateSceneNode" not complete'

            // TODO: Create a rotation matrix that rotates the node around the view-aligned axes
            // TODO: Use Input.getMouseDx(), Input.getMouseDy(), and delta_time to determine the amount of change
            // TODO: Store the matrix in variable 'rotation'
            let dx = Input.getMouseDx()
            let dy = Input.getMouseDy()
            if(dx !==0 || dy !== 0) {
                if(dy !==0) {
                    mat4.rotate(rotation, rotation, dy*Math.PI/180, vec3.set(vec3.create(), ...[0,0,1]))
                }
                if(dx!==0) {
                    mat4.rotate(rotation, rotation, dx*Math.PI/180, vec3.set(vec3.create(), ...[0,1,0]))
                }
            }
            // Set dirty flag to trigger model matrix updates
            node_dirty = true
        }

        // Control - Translate
        if (Input.isMouseDown(1) || (Input.isMouseDown(0) && Input.isKeyDown(' '))) {
            // throw '"WebGlApp.updateSceneNode" not complete'
            let dx = Input.getMouseDx()
            let dy = Input.getMouseDy()
            mat4.translate(translation, translation, vec3.set(vec3.create(), ...[-dx*delta_time,-dy*delta_time,0]))
            // TODO: Create a translation matrix that translates the node along the view-aligned axes
            // TODO: Use Input.getMouseDx(), Input.getMouseDy(), and delta_time to determine the amount of change
            // TODO: Store the matrix in variable 'translation'

            // Set dirty flag to trigger model matrix updates
            node_dirty = true
        }


        // Update node transformation if needed
        if (node_dirty) {
            // throw '"WebGlApp.updateSceneNode" not complete'

            // TODO: Apply the transformations (rotate, scale, translate) to the node's local transformation
            // TODO: The node's current transformation needs to stay intact, so you need to add your transformations to the existing one
            // TODO: Order of multiplication matters. Visualize the transformation that are applied to the node and in which order and how this order affects the node's final configuration
            // TODO: Transformations should be relative to teh current view (i.e. dragging left should translate the node to the left relative to the current view on the object - this is the most intuitive kind of movement and used in many 3D applications)
            // TODO: For this, you will need the node's local and world (!) matrices and they might need to be modified.

            // Get the node's world transformation and clone it to leave the original values intact in case we change it here
            let world_transformation = mat4.clone(node.getWorldTransformation())


            // Get the node's local transformation that we modify
            // Do not clone it since we WANT to modify this one
            let transformation = node.getTransformation()

            
            // TODO: Make any modifications or adaptions to the world matrix here and create any other needed variables

            // TODO: Apply the transformations (rotate, scale, translate) and any helper transformations in the correct order to 'transformation'
            
            mat4.multiply(transformation, transformation, rotation)
            mat4.multiply(transformation, transformation, scale)
            mat4.multiply(transformation, transformation, translation)
            // Update the node's transformation
            node.setTransformation(transformation)
        }
    }

    /**
     * Main render loop which sets up the active viewport (i.e. the area of the canvas we draw to)
     * clears the canvas with a background color and draws the scene
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Number} canvas_width The canvas width. Needed to set the viewport
     * @param {Number} canvas_height The canvas height. Needed to set the viewport
     */
    render( gl, canvas_width, canvas_height )
    {
        // Set viewport and clear canvas
        this.setViewport( gl, canvas_width, canvas_height )
        this.clearCanvas( gl )

        // Render the box
        // This will use the MVP that was passed to the shader
        this.box.render( gl )

        // Render the scene
        if (this.scene) this.scene.render( gl )
    }

}

export {
    WebGlApp
}
