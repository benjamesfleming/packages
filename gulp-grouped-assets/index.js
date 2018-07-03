const fs = require('fs');
const path = require('path');
const through = require('through2');
const _ = require('lodash');

const revHash = require('rev-hash');
const revPath = require('rev-path');
const filename = require('modify-filename');
const parent = require('parent-folder');

const PATH_MAP = {};

const AddAsset = (opts) => {
    return through.obj((file, enc, cb) => {
        let { group='all' } = opts || {}

        file.hash = revHash(file.contents);
        file.oldPath = file.path;
        file.path = filename(file.path, (fn, ext) => 
            revPath(fn, file.hash) + ext
        );

        group = group
            .replace('[ParentDIR]', parent(file.oldPath, true))
            .replace('[FileExt]', path.extname(file.oldPath))

        const index = path.basename(file.oldPath, path.extname(file.oldPath));
        const value = path.basename(file.path);

        _.set(PATH_MAP, `${group}[]`, {[index]: value})
        cb(null, file);
    });
};

const InjectAssets = (opts) => {
    return through.obj((file, enc, cb) => {
        let { fileAttr='data', group='[FileName]', extras={} } = opts || {}

        group = group
            .replace('[FileName]', path.basename(file.path, path.extname(file.path)))
            .replace('[FileExt]', path.extname(file.path))

        file[fileAttr] = Object.assign(PATH_MAP['all'], _.get(PATH_MAP, group), extras);
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