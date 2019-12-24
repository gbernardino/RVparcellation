import sfepy, vtk,  vtk.util.numpy_support as numpy_support
from sfepy.discrete.fem import Mesh, FEDomain, Field
from sfepy.discrete import (FieldVariable, Material, Integral, Function, Equation, Equations, Problem)
from sfepy.solvers.ls import ScipyDirect
from sfepy.solvers.nls import Newton
from sfepy.discrete.conditions import Conditions, EssentialBC

from sfepy.terms import Term
from sfepy.terms.terms_diffusion import LaplaceTerm
import utilities
import os, subprocess, sys,  pandas, numpy as np
from pymeshfix import _meshfix

def computeVolumeTetrahedralMesh(v):
    """
    Computes the volume of an Unstructured grid (as a VTK object)

    Returns result in ml(supposing input is in mm)
    """
    totalVol = 0
    for i in range(v.GetNumberOfCells()):
        tetra = v.GetCell(i)
        vol = tetra.ComputeVolume(v.GetPoint(tetra.GetPointId(0)),
                                  v.GetPoint(tetra.GetPointId(1)), v.GetPoint(tetra.GetPointId(2)), v.GetPoint(tetra.GetPointId(3)))
        totalVol += np.abs(vol)
    return totalVol/1e3


class cd:
    """
    Copied from https://stackoverflow.com/questions/431684/how-do-i-change-directory-cd-in-python
    Context manager for changing the current working directory"""
    def __init__(self, newPath):
        self.newPath = os.path.expanduser(newPath)

    def __enter__(self):
        self.savedPath = os.getcwd()
        os.chdir(self.newPath)

    def __exit__(self, etype, value, traceback):
        os.chdir(self.savedPath)

        

def clipVTK(meshVTK,th = 0, scalarName = 'rvot', insideOut = False):
    """
    Clips a mesh using VTK
    """
    meshVTK.GetPointData().SetActiveScalars(scalarName)
    clip = vtk.vtkClipDataSet()
    clip.SetValue(th)
    clip.SetInsideOut(insideOut)
    clip.SetInputData(meshVTK)
    clip.Update()
    return clip.GetOutput()

def appendBeforeFileType(filePath, toInsert):
    if filePath is None:
        return None
    split = filePath.split('.')
    return split[0] + toInsert + '.' + '.'.join(split[1:])

    

def solveTriangleCoordinates(trianglePoints, p):
    return scipy.linalg.solve.lsqr(scipy.linalg.blockm([trianglePoints, np.ones(3, 1)]), np.concatenate([p, np.ones(1)]))

class ClosestPointStupid:
    """
    Trivial solution of finding the closest way
    """
    def __init__(self, points, val, vtkMesh):
        self.points = points
        self.val = val
        self.j = 0
        self.locator = vtk.vtkCellLocator()
        self.locator.SetDataSet(vtkMesh)
        self.locator.BuildLocator()
        
    def findClosestPoint(self, p):
        # TODO: compute the closest point, compute the triangle coordinates of the intersection point in that triangle, and
        subId = vtk.mutable(0) 
        meshPoint = np.zeros(3)
        cellId = vtk.mutable(0) 
        dist2 =  vtk.mutable(0.) 
        self.locator.FindClosestPoint(p, meshPoint, cellId, subId, dist2)
        meshPoint
        cellId
        np.linalg.solve(self.points[self.triangles[cellId]], meshPoint)
    
    def interpolate(self, coors):
        """
        Define in base of coordinates...

        See if interpolations are possible
        """
        i = np.argmin(np.linalg.norm(coors - self.points, axis = 1))
        return self.val[i]

def cleanMesh(inputMesh, savePath):
    tin = _meshfix.PyTMesh()
    tin.load_file(inputMesh)
    tin.clean(max_iters=10, inner_loops=3)
    tin.select_intersecting_triangles()
    tin.save_file(savePath)
    
def surfaceToVolumetric(mesh, vtkMeshesPath, outputFolder, errors = {}, recompute = False):
    """
    Computes a tetrahedral mesh.    
    @param mesh: name of the mesh (in ply) 
    """
    if not isinstance(mesh, str):
        name = 'temporalMesh.ply'
        utilities.write_poly(mesh,os.path.join(outputFolder, name), format = 'ply' )
        mesh = os.path.abspath(os.path.join(outputFolder, name))
    elif mesh.endswith('.vtk'):
         mesh = mesh.split('.')[0] + '.ply'
    elif not mesh.endswith('.ply'):
        mesh = mesh + '.ply'
    
    vtkMeshesPath = os.path.abspath(vtkMeshesPath)
    outputFolder = os.path.abspath(outputFolder)
    mesh = os.path.join(vtkMeshesPath, mesh)

    newMeshName = appendBeforeFileType(mesh, 'cleaned')
    newMeshPath = os.path.join(outputFolder , newMeshName)
    resultPath = os.path.abspath(os.path.join(outputFolder, newMeshName.split('.')[0] + '.1.vtk'))
    if recompute or not os.path.exists(resultPath):
        print('Computing', resultPath)
        vtkMeshesPath = os.path.abspath(vtkMeshesPath)
        outputFolder = os.path.abspath(outputFolder)
        oldPath = os.getcwd()
        with cd(outputFolder):
            if vtkMeshesPath != outputFolder:
                subprocess.run(["cp", mesh , os.path.join(outputFolder , mesh)])  
            cleanMesh(mesh, newMeshPath)
      

            k = subprocess.run(["tetgen", "-pY", "-BENF", "-q1.4", "-k", newMeshPath])
            if k.returncode != 0:
                errors[mesh] = k.returncode
                print('Error meshing', k.returncode)
                os.chdir(oldPath)
                return ''
    return resultPath


def computeVolumes(meshVTK, th, scalarFieldName = 'rvot', path = None, writeInletOutlet = True, returnMeshes = False, **kwargs):
    meshVTK.GetPointData().SetActiveScalars(scalarFieldName)
    
    clip = vtk.vtkClipDataSet()
    clip.SetInputData(meshVTK)
    clip.SetValue(th)
    clip.SetInsideOut(kwargs.get('greaterOrEqual', True)) # Get <= 
    clip.Update()
    
    tetrahedrilize = vtk.vtkDataSetTriangleFilter()
    tetrahedrilize.SetInputConnection(clip.GetOutputPort())
    tetrahedrilize.Update()
    outlet = tetrahedrilize.GetOutput()
    
    clip2 = vtk.vtkClipDataSet()
    clip2.SetInputData(meshVTK)
    clip2.SetValue(th)
    clip2.SetInsideOut(not kwargs.get('greaterOrEqual', True))
    clip2.Update()
    
    tetrahedrilize2 = vtk.vtkDataSetTriangleFilter()
    tetrahedrilize2.SetInputConnection(clip2.GetOutputPort())
    tetrahedrilize2.Update()
    inlet = tetrahedrilize2.GetOutput()
    
    if path is not None:
        path = path.replace('.1', '')
        if writeInletOutlet:
            utilities.writeUnstructuredGridVTK(utilities.appendStringBeforeFileType(path, kwargs.get('name1','_inlet')), inlet)
            utilities.writeUnstructuredGridVTK(utilities.appendStringBeforeFileType(path, kwargs.get('name2' ,'_outlet')), outlet)
        else:
            utilities.writeUnstructuredGridVTK(path, inlet)
    if not returnMeshes:
        return computeVolumeTetrahedralMesh(inlet), computeVolumeTetrahedralMesh(outlet)
    else:
        return inlet, outlet
    
def computeGeodesicPartitionVolumes(meshVTK, rvotMethod = 'geodesic', methodGeodesic = 'Voronoi', path = None):
    """
    For a tetrahedral RV with the geodesic distancs, computes the distance of the partition in the different segmetns (RVOT/)
    
    rvotMethod: 
    - 'geodesic' : usual geodesic
    - 'equidistant' : cuts the RVOT by removing all points at a certain geodesic distance from the RVOT
    
    """
    if isinstance(meshVTK, str):
        mesh = utilities.readUnstructuredGridVTK(meshVTK)
        path = meshVTK
    else:
        mesh = meshVTK
    distanceTricuspid = numpy_support.vtk_to_numpy(mesh.GetPointData().GetArray('distanceTricuspid'))
    distanceApex = numpy_support.vtk_to_numpy(mesh.GetPointData().GetArray('distanceApex'))
    distancePulmonaryValve = numpy_support.vtk_to_numpy(mesh.GetPointData().GetArray('distancePulmonary'))


    if rvotMethod == 'equidistant':
        th = np.min(distancePulmonaryValve[np.where((distanceTricuspid - distancePulmonaryValve) < 0)])
        utilities.add_scalar(mesh, th - distancePulmonaryValve, 'pv')
        utilities.add_scalar(mesh, distanceTricuspid  - distanceApex, 'pa')
        utilities.add_scalar(mesh, distanceApex  - distanceTricuspid, 'pt')

    elif rvotMethod == 'geodesic': #Normal delauny like - cut
        utilities.add_scalar(mesh, np.minimum(distanceApex, distanceTricuspid) - distancePulmonaryValve, 'pv')
        utilities.add_scalar(mesh, distanceTricuspid  - distanceApex, 'pa')
        utilities.add_scalar(mesh, distanceApex  - distanceTricuspid, 'pt')

        
    else:
        raise ValueError('rvot partition method not recognized')
        
        
    
    if methodGeodesic == 'Voronoi':
        rvot, inletApical =  computeVolumes(mesh, 0, scalarFieldName= 'pv',  path = appendBeforeFileType(path, 'Pulmonary'), writeInletOutlet= False, returnMeshes = True)
        volumeRVOT = computeVolumeTetrahedralMesh(rvot)
        volumeRVInlet, _ =  computeVolumes(inletApical, 0, scalarFieldName= 'pt', path = appendBeforeFileType(path, 'Inlet'), writeInletOutlet= False)
        volumeRVApex, _ =  computeVolumes(inletApical, 0, scalarFieldName= 'pa', path = appendBeforeFileType(path, 'Apical'), writeInletOutlet = False)
    else:
        apex, inletRVOT =  computeVolumes(mesh, 0, scalarFieldName= 'pa', path = appendBeforeFileType(path, 'Apical'), writeInletOutlet = False,  returnMeshes = True)
        volumeRVApex = computeVolumeTetrahedralMesh(apex)
        
        volumeRVInlet, _ =  computeVolumes(inletRVOT, 0, scalarFieldName= 'pt', path = appendBeforeFileType(path, 'Inlet'), writeInletOutlet= False)
        volumeRVOT, _ =  computeVolumes(inletRVOT, 0, scalarFieldName= 'pv', path = appendBeforeFileType(path, 'Pulmonary'), writeInletOutlet = False)

    return  volumeRVOT, volumeRVInlet, volumeRVApex

def computeGeodesicPartitionVolumes4Parts(path):
    """
    For a tetrahedral RV with the geodesic distancs, computes the distance of the partition in the different
    """ 
    mesh = readUnstructuredGridVTK(path)
    distanceTricuspid = numpy_support.vtk_to_numpy(mesh.GetPointData().GetArray('distanceTricuspid'))
    distanceApex = numpy_support.vtk_to_numpy(mesh.GetPointData().GetArray('distanceApex'))
    distancePulmonaryValve = numpy_support.vtk_to_numpy(mesh.GetPointData().GetArray('distancePulmonary'))

    utilitiesMesh.add_scalar(mesh, np.minimum(distanceApex, distanceTricuspid) - distancePulmonaryValve, 'pv')
    utilitiesMesh.add_scalar(mesh, np.minimum(distanceTricuspid, distancePulmonaryValve) - distanceApex, 'pa')
    utilitiesMesh.add_scalar(mesh, np.minimum(distanceApex, distancePulmonaryValve)  - distanceTricuspid, 'pt')
    utilitiesMesh.add_scalar(mesh, distanceApex/  distanceTricuspid, 'pa/pt')

    volumeRVOT, volumeInletApical =  computeVolumes(mesh, 0, scalarFieldName= 'pv',   returnMeshes = True,
                                                    path = appendBeforeFileType(path, 'Pulmonary'), writeInletOutlet= False)
    
    volumeRVApex, volumeRVInletMid =  computeVolumes(volumeInletApical, .5, scalarFieldName= 'pa/pt', greaterOrEqual = False,
                                                     path = appendBeforeFileType(path, 'Apex'), writeInletOutlet= False, returnMeshes = True)
    volumeRVMid, volumeRVInlet =  computeVolumes(volumeRVInletMid, 2, scalarFieldName= 'pa/pt', greaterOrEqual = True,
                                                 path = path, name1 = 'Inlet', name2 = 'Mid', returnMeshes = True)
    
    
    vols = tuple([computeVolumeTetrahedralMesh(v) for v in [volumeRVOT,volumeRVInlet,volumeRVMid,volumeRVApex]])
    return  vols


def solveLaplaceEquationTetrahedral(mesh,meshVTK, boundaryPoints, boundaryConditions):
    """
    mesh: path to a 3D mesh / sfepy mesh
    
    """
    if isinstance(mesh, str):
        mesh = Mesh.from_file(mesh)
    
    #Set domains
    domain = FEDomain('domain', mesh)
    omega = domain.create_region('Omega', 'all')
    boundary = domain.create_region('gamma', 'vertex  %s' % ','.join(map(str, range(meshVTK.GetNumberOfPoints()))), 'facet')

    #set fields
    field = Field.from_args('fu', np.float64, 1, omega, approx_order=1)
    u = FieldVariable('u', 'unknown', field)
    v = FieldVariable('v', 'test', field, primary_var_name='u')
    m = Material('m', val = [1.])

    #Define element integrals
    integral = Integral('i', order=3)

    #Equations defining 
    t1 = Term.new('dw_laplace( v, u )',
            integral, omega,v=v, u=u)
    eq = Equation('balance', t1)
    eqs = Equations([eq])
    
    
    heatBoundary = boundaryConditions
    points = boundaryPoints

    #Boundary conditions
    c = ClosestPointStupid(points,heatBoundary, meshVTK)

    def u_fun(ts, coors, bc=None, problem=None, c = c):
        c.distances = []
        v = np.zeros(len(coors))
        for i, p in enumerate(coors):
            v[i] = c.interpolate(p)
            #c.findClosestPoint(p)
        return v

    bc_fun = Function('u_fun', u_fun)
    fix1 = EssentialBC('fix_u', boundary, {'u.all' : bc_fun})
    
    #Solve problem
    ls = ScipyDirect({})
    nls = Newton({}, lin_solver=ls)

    pb = Problem('heat', equations=eqs)
    pb.set_bcs(ebcs=Conditions([fix1]))

    pb.set_solver(nls)
    state = pb.solve(verbose = False, save_results = False)
    u = state.get_parts()['u']
    return u

def extendScalarField(tetraMeshPath,  meshVTK = None, threshold = None, meshNameType = '_withScalarField', recompute = False):
    """
    Given two meshes, one superficial and another tetrahedral, extends all the scalar fields in the superficial mesh to the superficial using Laplace equation (Heat equation)

    TODO: vectorise the sfepy problem for speedup!

    """
    writePath = appendBeforeFileType(tetraMeshPath, meshNameType).replace('.1', '')
    if recompute or not os.path.exists(writePath):
        mesh = Mesh.from_file(tetraMeshPath)
        #horrible way, but could not write fields on ply files...
        if isinstance(meshVTK, str) :
            meshVTK = utilities.read_poly(meshVTK)
        #Poly
        reader = vtk.vtkUnstructuredGridReader()
        reader.SetFileName(tetraMeshPath)
        reader.Update()
        v = reader.GetOutput()

        for i in range(meshVTK.GetPointData().GetNumberOfArrays()):
            heatBoundary = numpy_support.vtk_to_numpy(meshVTK.GetPointData().GetArray(i))
            points = utilities.vtk_to_numpy(meshVTK, flatten = False)

            u = solveLaplaceEquationTetrahedral(mesh, meshVTK, points, heatBoundary)
            array = numpy_support.numpy_to_vtk(u)
            array.SetName(meshVTK.GetPointData().GetArray(i).GetName())
            v.GetPointData().AddArray(array)

        #Write poly
        utilities.writeUnstructuredGridVTK(writePath, v)
    else:
        v = utilities.readUnstructuredGridVTK(writePath)
    #Do the split
    if threshold is not None:
        return writePath, computeVolumes(v, threshold,  path = writePath)
    else:
        return writePath