import vtk, sys, os, numpy as np

import utilities
import extendField, pathlib, os, pandas, gdist
import matplotlib.pyplot as plt
import logging, argparse, pickle, scipy, scipy.stats
from vtk.util import numpy_support


def concatenateDict(*args):
    dRes = {}
    for d in args:
        dRes.update(d)
    return dRes




def meshPartitionGeodesics(mesh, writePath, pointsPulmonary, pointsTricuspid, apexId):
    """
    Creates a mesh in PLY (need for the tetrahedralization) and another one in VTK with the fields, because the PLY doesn't store the fields. Space is cheap, anyway.
    
    writePath needs to be the file path without extension.
    """

    points, faces = utilities.vtk_to_numpy(mesh, returnFaces= True, flatten= False)
    faces = faces.astype(np.int32)
    distancePulmonary = gdist.compute_gdist(points, faces, pointsPulmonary.astype(np.int32))
    distanceTricuspid = gdist.compute_gdist(points, faces, pointsTricuspid.astype(np.int32))
    distanceApex = gdist.compute_gdist(points, faces, np.array([apexId], dtype = np.int32))
    

    utilities.add_scalar(mesh,distancePulmonary, 'distancePulmonary')
    utilities.add_scalar(mesh,distanceApex, 'distanceApex')
    utilities.add_scalar(mesh,distanceTricuspid, 'distanceTricuspid')

    if writePath:
        utilities.write_poly(mesh,writePath + '.vtk', scalarFields = [distancePulmonary,  distanceApex, distanceTricuspid],
                             scalarFieldNames = ['distancePulmonary',  'distanceApex', 'distanceTricuspid']
                                 , format = 'vtk')
        utilities.write_poly(mesh,writePath, format = 'ply')
        
    return mesh

def propagateScalars(mesh, writePath, referenceMesh):
    arraysToCopy = {}
    arraysToCopy['distancePulmonary'] = numpy_support.vtk_to_numpy(referenceMesh.GetPointData().GetArray('distancePulmonary'))
    arraysToCopy['distanceApex'] = numpy_support.vtk_to_numpy(referenceMesh.GetPointData().GetArray('distanceApex'))
    arraysToCopy['distanceTricuspid'] = numpy_support.vtk_to_numpy(referenceMesh.GetPointData().GetArray('distanceTricuspid'))
    for k, c in arraysToCopy.items():
        utilities.add_scalar(mesh, c, k)
    if writePath:
        utilities.write_poly(mesh,writePath + '.vtk', scalarFields = list(arraysToCopy.values()),
                             scalarFieldNames = list(arraysToCopy.keys()), format = 'vtk')
        utilities.write_poly(mesh,writePath, format = 'ply')
    return mesh


def subVolumePartition(mesh,vtkName, writeFolder, rvotMethod = 'geodesic', **kwargs):
    """
    mesh: vtk mesh that will be partitioned
    vtkName: name of the vtk mesh (without the .vtk)

    Optional arguments, one of thw two needs to be present
    vtkMeshTemplate : use a template and point to point correspondence to propagate labels
    anatomicLabels: computes the partition using the landmarks
    """
    recompute = kwargs.get('recompute', False)
    geodesicPath = os.path.join(writeFolder, vtkName)
    if 'anatomicLabels' in kwargs:
        anatomicLabels = kwargs['anatomicLabels']
        meshPartitionGeodesics(mesh, geodesicPath, 
                               anatomicLabels['pointsPulmonary'],  anatomicLabels['pointsTricuspid'],  anatomicLabels['apexId'])

    elif 'vtkMeshTemplate' in kwargs:
        mesh = propagateScalars(mesh, geodesicPath, kwargs['vtkMeshTemplate'])
    else:
        raise ValueError('No anatomic labels or template')
    vtkVolumetricPath = extendField.surfaceToVolumetric(mesh, 
                                                        writeFolder, writeFolder, recompute = recompute)
    if not vtkVolumetricPath:
        return 0,0,0
    logging.info('outputPath = %s' % os.path.join(writeFolder, vtkName))
    vtkVolumetricWithFieldsPath = extendField.extendScalarField(vtkVolumetricPath, mesh, meshNameType = '_tetra',
                                  recompute = recompute)
    rvot, inlet, apex = extendField.computeGeodesicPartitionVolumes(vtkVolumetricWithFieldsPath)
    return rvot, inlet, apex

def readLabelsRVTOMTEC():
    """
    Read labels from hardcoded directories. Files needed:
    - Data/0_referenceADDETIA_CELLS.vtk
    - Data/pointsSeptum.csv
    - Data/facesTricuspid2.csv
    - Data/facesPulmonary2.csv
    """
    _, triangles = utilities.vtk_to_numpy(utilities.read_poly('Data/0_referenceADDETIA_CELLS.vtk'), returnFaces= True) # Just a mesh to get its topology
    facesTricuspid = pandas.read_csv('./Data/facesTricuspid2.csv')
    facesPulmonary = pandas.read_csv('./Data/facesPulmonary2.csv')
    pointsTricuspid = set()
    for _, f in facesTricuspid.iterrows():
        t = triangles[f.vtkOriginalCellIds]
        pointsTricuspid.add(t[0])
        pointsTricuspid.add(t[1])
        pointsTricuspid.add(t[2])
    pointsTricuspid = np.array(list(pointsTricuspid)) 

    pointsPulmonary = set()
    for _, f in facesPulmonary.iterrows():
        t = triangles[f.vtkOriginalCellIds]
        pointsPulmonary.add(t[0])
        pointsPulmonary.add(t[1])
        pointsPulmonary.add(t[2])
    pointsPulmonary = np.array(list(pointsPulmonary)) 

    facesValve = np.concatenate([facesPulmonary.vtkOriginalCellIds.values, facesTricuspid.vtkOriginalCellIds.values])
    apexId = 906
    midTricuspid = 102
    midPulmonary = 63

    septumPointsIDs = pandas.DataFrame.from_csv('Data/pointsSeptum.csv').values.reshape(-1)
    facesSeptum = []
    for i,t in enumerate(triangles):
        if all(map(lambda pointID: pointID in septumPointsIDs , t)): 
            facesSeptum.append(i)
    facesLateral = [i for i in range(len(triangles)) if i not in facesValve and i not in facesSeptum]
    anatomicLabels = {}
    anatomicLabels['apexId'] = apexId
    anatomicLabels['facesLateral'] = facesLateral
    anatomicLabels['facesSeptum'] = facesSeptum
    anatomicLabels['pointsTricuspid'] = pointsTricuspid
    anatomicLabels['facesValve'] = facesValve
    anatomicLabels['pointsPulmonary'] = pointsPulmonary
    anatomicLabels['pointsValve'] =np.concatenate([pointsPulmonary, pointsTricuspid])

    return anatomicLabels

def regionalEjectionFraction(volumes):
    ed_frame = 0
    es_frame = np.argmin(np.sum(volumes, axis =1))
    return (volumes[ed_frame, :] - volumes[es_frame, :])/volumes[ed_frame, :]
def computeEDVEF(meshes):
    """
    Computes from a
    """
    anatomicLabels = readLabelsRVTOMTEC()
    if isinstance(meshes, list):
        meshes = {k:m for k, m in enumerate(meshes)}
    readIfString = lambda s: utilities.read_poly(s) if isinstance(s, str) else s
    meshes = {int(i): readIfString(m)  for i,m in meshes.items()}
    meshesList = [meshes[i] for i in range(len(meshes))]
    volumes = []
    for i, m in enumerate(meshesList):
        if i == 0:
            mesh_0 = meshPartitionGeodesics(m ,writePath = '/tmp/meshName', 
                                            pointsPulmonary =anatomicLabels['pointsPulmonary'], 
                                            pointsTricuspid =anatomicLabels['pointsTricuspid'],  
                                            apexId = anatomicLabels['apexId'])

        volumes.append(subVolumePartition(meshesList[i], 'meshName', '/tmp', vtkMeshTemplate = mesh_0, recompute = True))
    volumes = np.array(volumes)
    return np.concatenate([volumes[0], regionalEjectionFraction(volumes)])

if __name__ == '__main__':

    parser = argparse.ArgumentParser(description='Computes the regional volumes dynamics.')
    parser.add_argument('inputPath', 
                        help=' input path with the vtk meshes')
    parser.add_argument('outputPathResult',  help='path to write the dictionary')

    parser.add_argument('outputPathMeshes', 
                        help='path to write all the meshes')
    
    parser.add_argument('-rvotMethod', default = 'geodesic', 
                        help='geodesic/heat')
    parser.add_argument('--recompute', action = 'store_true', 
                        help='path to write all the meshes')

    args = parser.parse_args()

    #-------------------- 
    # Read the klabels
    #--------------------
    anatomicLabels = readLabelsRVTOMTEC()
    
    allVolumes = {}
    print('Recompute = ', args.recompute)
    for pId in os.listdir(args.inputPath):
        if '00.vtk' not in pId:
            continue
        pId = '_'.join(pId.split('_')[:-1]) + '_'
        print('pId = %s' % pId)
        meshes = utilities.read_meshes(args.inputPath,pId, convertToNumpy= False)
        meshes = {int(i): m  for i,m in meshes.items()}
        meshesList = [meshes[i] for i in range(len(meshes))]
        volumes = []
        for i, m in enumerate(meshesList):
            if i == 0:
                mesh_0 = meshPartitionGeodesics(m ,writePath = None, 
                                                pointsPulmonary =anatomicLabels['pointsPulmonary'], 
                                                pointsTricuspid =anatomicLabels['pointsTricuspid'],  
                                                apexId = anatomicLabels['apexId'])

            volumes.append(subVolumePartition(meshesList[i], pId + '_%d' % i, args.outputPathMeshes, rvotMethod = args.rvotMethod,  vtkMeshTemplate = mesh_0, recompute = args.recompute))
        allVolumes[pId] = np.array(volumes)
       
    with open(args.outputPathResult, 'wb') as file:
        pickle.dump(allVolumes, file)
