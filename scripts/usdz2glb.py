#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["usd-core>=25.0", "trimesh>=4.0", "numpy", "pygltflib"]
# ///
"""Convert the flasher's device USDZ models to GLB.

Each USDZ is a set of triangulated meshes with a UsdPreviewSurface material.
The GLB keeps the mesh names, the PBR factors, Y up and meters, and carries the
layer metadata (copyright, dimensions, source image) in asset.extras.

usage: usdz2glb.py <in.usdz>... --out <dir>
"""

import argparse
import json
import pathlib
import struct
import sys

import numpy as np
import pygltflib
import trimesh
from pxr import Gf, Usd, UsdGeom, UsdShade


def material_factors(prim):
    mat = UsdShade.MaterialBindingAPI(prim).ComputeBoundMaterial()[0]
    color, metallic, roughness, name = (0.8, 0.8, 0.8), 0.0, 0.5, "default"
    if mat:
        name = mat.GetPrim().GetName()
        shader = UsdShade.Shader(mat.GetPrim().GetChild("Surface"))
        inputs = {i.GetBaseName(): i.Get() for i in shader.GetInputs()}
        if inputs.get("diffuseColor") is not None:
            color = tuple(inputs["diffuseColor"])
        if inputs.get("metallic") is not None:
            metallic = float(inputs["metallic"])
        if inputs.get("roughness") is not None:
            roughness = float(inputs["roughness"])
    return name, color, metallic, roughness


def convert(src: pathlib.Path, dst: pathlib.Path):
    stage = Usd.Stage.Open(str(src))
    assert UsdGeom.GetStageUpAxis(stage) == "Y", src
    assert UsdGeom.GetStageMetersPerUnit(stage) == 1.0, src
    scene = trimesh.Scene()
    for prim in stage.Traverse():
        if not prim.IsA(UsdGeom.Mesh):
            continue
        mesh = UsdGeom.Mesh(prim)
        counts = np.array(mesh.GetFaceVertexCountsAttr().Get())
        assert (counts == 3).all(), f"{src}: {prim.GetPath()} is not triangulated"
        faces = np.array(mesh.GetFaceVertexIndicesAttr().Get()).reshape(-1, 3)
        points = np.array(mesh.GetPointsAttr().Get(), dtype=np.float64)
        xf = UsdGeom.Xformable(prim).ComputeLocalToWorldTransform(Usd.TimeCode.Default())
        m = np.array(xf, dtype=np.float64).T  # USD is row-vector; trimesh wants column-vector
        if mesh.GetOrientationAttr().Get() == "leftHanded":
            faces = faces[:, ::-1]
        name, color, metallic, roughness = material_factors(prim)
        normals = mesh.GetNormalsAttr().Get()
        assert normals is not None and mesh.GetNormalsInterpolation() == "vertex", src
        tm = trimesh.Trimesh(
            vertices=points, faces=faces, vertex_normals=np.array(normals, dtype=np.float64), process=False
        )
        tm.apply_transform(m)
        tm.visual = trimesh.visual.TextureVisuals(
            material=trimesh.visual.material.PBRMaterial(
                name=name,
                baseColorFactor=[*color, 1.0],
                metallicFactor=metallic,
                roughnessFactor=roughness,
            )
        )
        scene.add_geometry(tm, node_name=prim.GetName(), geom_name=prim.GetName())

    layer = dict(stage.GetRootLayer().customLayerData)
    glb = pygltflib.GLTF2.load_from_bytes(scene.export(file_type="glb", include_normals=True))
    for mesh_ in glb.meshes:
        for prim_ in mesh_.primitives:
            assert prim_.attributes.NORMAL is not None, f"{src}: {mesh_.name} lost its normals"
            for acc in (prim_.attributes.POSITION, prim_.attributes.NORMAL):
                glb.bufferViews[glb.accessors[acc].bufferView].target = pygltflib.ARRAY_BUFFER
            glb.bufferViews[glb.accessors[prim_.indices].bufferView].target = pygltflib.ELEMENT_ARRAY_BUFFER
    glb.asset.copyright = layer.pop("copyright", None)
    glb.asset.generator = "usdz2glb.py (trimesh) from " + layer.pop("generator", "usdz")
    extras = {}
    for k, v in layer.items():
        extras[k] = list(v) if isinstance(v, Gf.Vec3f) else v
    glb.asset.extras = extras
    glb.save_binary(str(dst))
    return len(scene.geometry)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inputs", nargs="+", type=pathlib.Path)
    ap.add_argument("--out", required=True, type=pathlib.Path)
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    for src in args.inputs:
        dst = args.out / (src.stem + ".glb")
        n = convert(src, dst)
        print(f"{src.name} -> {dst.name} ({n} meshes, {dst.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
