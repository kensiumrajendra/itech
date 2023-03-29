import _ from 'lodash';

/**
 * Resets the object property descriptors for an object.
 * It recreates the object with the same properties to reset the descriptors.
 *
 * For use on ES module objects where you cannot reassign nor redefine a
 * property (a pain when wrapping) when its properties have no value (but
 * with a getter) while the `configurable` descriptor that is `false`.
 * (Which could be because of the properties being exported functions?)
 *
 * @param instance The B3 instance.
 * @param path Path to object.
 */
export function resetObjectPropertyDescriptors(instance, path) {
    const lastInPath = path[path.length - 1];
    const parentPath = path.slice(0, -1);
    const parent = _.get(instance, parentPath, instance);

    const { writable } = Object.getOwnPropertyDescriptor(
        _.get(instance, path),
        Object.keys(_.get(instance, path))[0],
    );

    if (!writable) { // check if one of the keys is writable already
        parent[lastInPath] = Object.assign({}, parent[lastInPath]);
    }
}

export default resetObjectPropertyDescriptors;
