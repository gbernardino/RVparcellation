from flask import Flask, send_file, jsonify
from flask_restful import Resource, Api, request
from flask_cors import CORS
import sys, os, pathlib
import computeRegionalVolumeDynamics, utilities
app = Flask(__name__)
api = Api(app)
CORS(app)

@app.route('/computePartitionSingleIndividual', methods = [ 'POST'])
def computePartitionSingleIndividual():
    pId = request.form['pId']
    format = request.form.get('format', 'vtk')
    print('pID =', pId, type(pId), file=sys.stderr)
    folderPath = pathlib.Path('/tmp') / pId
    folderPath.mkdir(parents=True, exist_ok=True)
    meshes = {}
    #Write files to the tmp folder
    print('Format = ', format)
    for t in request.files:
        print(t)
        path = str(folderPath / (pId + '_%3d' % int(t) ) )
        request.files[t].save(path + '.' + format)
        meshes[t] = path + '.vtk'
    utilities.convert_ucd_to_vtk(folderPath, folderPath)
    #Do the computations   <- Try cellery for a more elegant approach
    values = computeRegionalVolumeDynamics.computeEDVEF(meshes)
    #Return the computations (so far only the measurements, possibly return also the partitions (for ED and ES))

    return jsonify({'outflowEDV' : values[0],'inletEDV' : values[1], 'apicalEDV' : values[2], 'outflowEF' : values[3],'inletEF' : values[4], 'apicalEF' : values[5]})
    #For returning files, see https://stackoverflow.com/questions/28568687/download-multiple-csvs-using-flask/41374226
    #return send_file(path, as_attachment=True)

@app.route('/testGet', methods = [ 'GET'])
def testGet():
    return jsonify({'meow' : 'test'})


@app.route('/getFile', methods = [ 'GET'])
def getFile():
    #TODO: this is highly unsecure, check that the parameters are well.
    pId = request.form['pId']
    fileName = request.form['pId']
    path = pathlib.Path('/tmp') / pId / fileName
    return send_file(str(path), as_attachment=True)  

def test():
    path = './Data/Example'
    files  = os.listdir(path)
    meshes = list(map( lambda s: os.path.join(path, s), sorted(files)))
    print(computeRegionalVolumeDynamics.computeEDVEF(meshes))

if __name__ == '__main__':
    app.run(debug=True,  host='0.0.0.0')