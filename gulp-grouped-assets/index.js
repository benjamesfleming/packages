const fs = require('fs');
const path = require('path');
const through = require('through2');

const revHash = require('rev-hash');
const revPath = require('rev-path');
const filename = require('modify-filename');
const parent = require('parent-folder');

let PATH_MAP = {};
// const formatPathMap = () => 
//     _(PATH_MAP)
//         .groupBy('page')
//         .mapValues(pages => 
//             _(pages)
//                 .groupBy('group')
//                 .mapValues(group => _.map(group, 'value'))
//                 .mapValues(group => _.assign(...group))
//                 .value()
//         )
//         .value();

const AddAsset = (opts) => {
    let { group='all' } = opts || {}
    
    return through.obj((file, enc, cb) => {
        file.hash = revHash(file.contents);
        file.oldPath = file.path;
        file.path = filename(file.path, (fn, ext) => 
            revPath(fn, file.hash) + ext
        );

        ([
            ['[ParentDIR]', parent(file.oldPath, true)],
            ['[FileExt]', path.extname(file.oldPath)]
        ]).forEach(([key, value]) => group = group.replace(key, value));

        const index = path.basename(file.oldPath, path.extname(file.oldPath));
        const value = path.basename(file.path);

        _.set(PATH_MAP, `${group}[]`, {[index]: value})
        cb(null, file);
    });
};

const InjectAssets = (opts) => {
    let { fileAttr='data', group='[FileName]' } = opts || {}

    return through.obj((file, enc, cb) => {
        ([
            ['[FileName]', path.basename(file.path, path.extname(file.path))],
            ['[FileExt]', path.extname(file.path)]
        ]).forEach(([key, value]) => group = group.replace(key, value));

        file[fileAttr] = Object.assign(PathMap['all'], _.get(PATH_MAP, group));
        cb(null, file);
    })
};

const saveManifest = (location) => {
    return new Promise((resolve, reject) => {
        fs.writeFile(
            location, 
            JSON.stringify(PATH_MAP, null, 2),
            err => {
                if (err) { return reject(err) }
                return resolve(true)
            }
        )
    })
};

module.exports = AddAsset;
module.exports.inject = InjectAssets;
module.exports.manifest = saveManifest;