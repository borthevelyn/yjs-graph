//@ts-nocheck
import { useCallback, useState } from "react"

export function useSet<T>(initial?: ReadonlySet<T>): 
    [ReadonlySet<T>, (toAdd: T) => void, (toRemove: T) => void] {
    const [set, setSet] = useState<ReadonlySet<T>>(initial ?? new Set<T>())

    const addFun = useCallback((toAdd: T) => {
        setSet(prev => prev.union(new Set([toAdd])))
    }, [setSet])

    const removeFun = useCallback((toRemove: T) => {
        setSet(prev => prev.difference(new Set([toRemove])))
    }, [setSet])

    return [set, addFun, removeFun]
}