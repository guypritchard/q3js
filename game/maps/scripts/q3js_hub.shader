q3js/portal_panel
{
    cull disable
    surfaceparm nolightmap
    surfaceparm nonsolid
    surfaceparm trans
    sort decal
    {
        map $whiteimage
        blendFunc GL_SRC_ALPHA GL_ONE_MINUS_SRC_ALPHA
        rgbGen vertex
        alphaGen vertex
    }
}
