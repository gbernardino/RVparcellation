import vtk
import numpy
import os
def numpy_to_vtk_faces(faces):
    """
    transform a list of lists of indices to a vtk cell
    """
    vtkCells = vtk.vtkCellArray()
    for f in faces:
        vtkCells.InsertNextCell(len(f))
        for id in f:
            vtkCells.InsertCellPoint(id)
    return vtkCells

def numpy_to_vtk(pointArray, faces = None, scalarFields = []):
    """
    Converst a mesh in numpy format to vtk.
    Needs that pointArray is either a shape vector (p1x, p1y, p1z, p2x, p2y ....) or a matrix of shape nPoints x 3

    """
    pd = vtk.vtkPolyData()
    
    if len(pointArray.shape) > 1:
        pointArray = pointArray.reshape(-1)
    
    points = vtk.vtkPoints()
    for i in range(int(len(pointArray)/3)):
        points.InsertNextPoint(pointArray[3*i],pointArray[3*i + 1], pointArray[3*i + 2])
    pd.SetPoints(points)

    if faces is not None and isinstance(faces, vtk.vtkCellArray):
        pd.SetPolys(faces)

    elif faces is not None:
        vtkPolys = numpy_to_vtk_faces(faces)
        pd.SetPolys(vtkPolys)

    for i, s in enumerate(scalarFields):
        add_scalar(pd, s, 'scalar_%d' % i)

    return pd



def vtk_to_numpy(vtkMesh, flatten = True, returnFaces = False, trianglesOnly = True):
    """
    Converst a TRIANGULAR mesh to numpy,
    """
    nPoints = vtkMesh.GetNumberOfPoints()
    d = numpy.zeros(nPoints * 3)
    for i in range(nPoints):
        p = vtkMesh.GetPoints().GetPoint(i)
        d[3*i] = p[0]
        d[3*i + 1] = p[1]
        d[3*i + 2] = p[2]
    if not flatten:
        d = d.reshape((-1, 3))

    if not returnFaces:
        return d
    else:
        faces = []
        indicesCorrect = []
        for i in range(vtkMesh.GetNumberOfCells()):
            if trianglesOnly and vtkMesh.GetCell(i).GetNumberOfPoints() > 3:
                raise ValueError('Mesh is not triangular')
            if vtkMesh.GetCell(i).GetNumberOfPoints()  != 3: #If is a line
                continue
            indicesCorrect.append(i)
            faces.append([])
            for j in range(vtkMesh.GetCell(i).GetNumberOfPoints()):
                faces[-1].append(int(vtkMesh.GetCell(i).GetPointId(j)))
        if trianglesOnly:
            faces = numpy.array(faces)
        return d, faces

def write_poly(mesh,filename, scalarFields = [], vectorFields = [], vectorFieldNames = [], scalarFieldNames = [], format = 'vtk', writeBinary = False):
    mesh2 = vtk.vtkPolyData()
    mesh2.DeepCopy(mesh)
    for i, a in enumerate(scalarFields):
        name = scalarFieldNames[i] if scalarFieldNames else 'scalar_%d' % i
        add_scalar(mesh2, a, name)
    for i, v in enumerate(vectorFields):
         name = vectorFieldNames[i] if vectorFieldNames else 'vector_%d' % i
         add_vector_field(mesh2, v, name)
    if format == 'vtk':
        writer = vtk.vtkPolyDataWriter()
        if not filename.endswith('.vtk'):
            filename = filename + '.vtk'

    elif format == 'ply':
        writer = vtk.vtkPLYWriter()
        writer.SetFileTypeToASCII ()
        if filename.endswith('.vtk'):
            filename = filename[:-4]
        if not filename.endswith('.ply'):
            filename = filename + '.ply'
    else: 
        raise NotImplemented('Can not recognize format %s'% format)

    writer.SetFileName(filename)
    writer.SetInputData(mesh2)
    if writeBinary:
        writer.SetFileTypeToBinary()
    writer.Update()
    writer.Write()
    if not writeBinary:
        os.system("perl -pi -e 's/,/./g' %s " % filename)


def add_scalar(mesh, array, name = 'scalarField', domain = 'point'):
    scalars = vtk.vtkFloatArray()
    scalars.Initialize()
    scalars.SetName(name)
    scalars.SetNumberOfComponents(1)
    for i, v in enumerate(array):
        scalars.InsertNextValue(v)
    if domain == 'point':
        mesh.GetPointData().AddArray(scalars)
    else:
        mesh.GetCellData().AddArray(scalars)

def read_meshes(path, prefix = '', convertToNumpy = True):
    """
    Read all meshes starting with a certian prefix in the given path.
    """
    meshes = {}
    for p in filter(lambda s: s.startswith(prefix) and s.endswith('.vtk'), os.listdir(path)):
        vtkPath = os.path.join(path, p)
        vtkMesh = read_poly(vtkPath)
        id = p[len(prefix): - len('.vtk')]
        if convertToNumpy:
            meshes[id] = vtk_to_numpy(vtkMesh)
        else:
            meshes[id] = vtkMesh
    return meshes

def read_poly(filePath, readUnstructured = True): 
    """
    Reads a polymehs
    """
    if not os.path.isfile(filePath):
        raise Exception('File "%s"does not exist.' % filePath)
    reader = vtk.vtkPolyDataReader()
    reader.SetFileName(filePath)
    reader.Update()
    output = reader.GetOutput()
    if readUnstructured and output.GetNumberOfPoints() == 0 and output.GetNumberOfCells() == 0:
        outputUnstructured = readUnstructuredGridVTK(filePath)
        return unstructuredGridToPolyData(outputUnstructured)
    else:
        return reader.GetOutput()

def appendStringBeforeFileType(filePath, toInsert):
    if filePath is None:
        return None
    split = filePath.split('.')
    return split[0] + toInsert + '.' + '.'.join(split[1:])


def readUnstructuredGridVTK(filePath):
    reader = vtk.vtkUnstructuredGridReader()
    reader.SetFileName(filePath)
    reader.Update()
    return reader.GetOutput()

def writeUnstructuredGridVTK(filePath, vtkUnstructuredGrid):
    writer = vtk.vtkUnstructuredGridWriter()
    writer.SetFileName(filePath)
    writer.SetInputData(vtkUnstructuredGrid)
    writer.SetFileTypeToBinary()
    writer.Update()
    writer.Write()


def unstructuredGridToPolyData(m):
    f = vtk.vtkGeometryFilter()
    f.SetInputData(m)
    f.Update()
    return f.GetOutput()


def convert_ucd_to_vtk(path, outputPath, toKeep = None, patientIdTransform = lambda s: s, recompute = False, debug = False):
    """
    Changes from VTK to UCD
    """ 
    try:
        os.mkdir(outputPath)
    except:
        pass
    vtkMeshes = []
    if isinstance(toKeep, str):
        listOfPoints = []
        with open(toKeep) as f:
            listOfPoints = map(int, f.readlines())
        toKeep = set(listOfPoints)

    for fileName in filter(lambda s: s.endswith('.ucd') and not s.startswith('.'), os.listdir(path)):
        outPathFile = os.path.join(outputPath,'%s.vtk') % patientIdTransform(fileName.split('.')[0])
        if not recompute and os.path.exists(outPathFile):
            print ('Skipping:  %s   / outputName %s' % (fileName, patientIdTransform(fileName.split('.')[0]))) 
            continue

        else:
            print ('Processing:  %s   / outputName %s' % (fileName, patientIdTransform(fileName.split('.')[0]))) 

        with open(os.path.join(path, fileName) , mode = 'r') as f:
            for i, l in enumerate(f.readlines()):
                if i == 0:
                    nPoints, nFaces, _, _, _ = list(map(int, l.split()))
                    points = numpy.zeros([nPoints, 3])
                    triangles = numpy.zeros([nFaces, 3], dtype = numpy.uint16)
                    pointData = numpy.zeros([nPoints, 2])

                    iFaces = 0
                    iPoints = 0
                    iPointsData = 0
                    slackLines = 3
                elif iPoints < nPoints:
                    points[iPoints] = list(map(float, l.split()[1:]))
                    iPoints += 1

                elif iFaces < nFaces:
                    triangles[iFaces] = list(map(int, l.split()[-3 : ]))
                    iFaces += 1

                elif slackLines:
                    slackLines -= 1

                elif iPointsData < nPoints:
                    pointData[iPointsData] = list(map(float, l.split()[-2 : ]))
                    iPointsData += 1
        #Remove the base
        if toKeep is not None:
            pointsNew = points[toKeep, :]
            trianglesNew = []
            for t in triangles:
                if any(map(lambda i: i not in toKeep, t)):
                    continue
                trianglesNew.append(list(map(lambda i: toKeep.index(i), t)))
            trianglesNew = numpy.array(trianglesNew)

            vtkMesh = numpy_to_vtk(pointsNew, trianglesNew )
            write_poly(vtkMesh, outPathFile, scalarFields= [pointData[toKeep, 0], pointData[toKeep, 1]])
        else:
            vtkMesh = numpy_to_vtk(points, triangles )
            write_poly(vtkMesh, outPathFile, scalarFields=[ pointData[:, 0], pointData[:, 1] ])

        if debug:
            print('Stopping after a single iteration (Turn off debugging)')
            break
        #vtkMeshes.append(vtkMesh)
    return vtkMeshes
