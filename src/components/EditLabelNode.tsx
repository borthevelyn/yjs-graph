import { Handle, Position } from "@xyflow/react";
import { memo } from "react";

export default memo(function(node: { id: string, data: {label: string, setLabel: (id: string, label: string) => void }}) {
    return (
        <>
            <Handle
                type="target"
                position={Position.Left}
                style={{ background: '#555' }}
                onConnect={(params) => console.log('handle onConnect', params)}
                isConnectable={true}
            />
            <input
                className="nodrag"
                onChange={(e) => node.data.setLabel(node.id, e.target.value)}
                defaultValue={node.data.label}
            />
            <Handle
                type="source"
                position={Position.Right}
                style={{ background: '#555' }}
                onConnect={(params) => console.log('handle onConnect', params)}
                isConnectable={true}
            />
        </>
    )
})