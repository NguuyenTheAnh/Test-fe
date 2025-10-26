import { CrownOutlined } from '@ant-design/icons';
import { Result } from 'antd';

const HomePage = () => {
    return (
        <div style={{ padding: 20 }}>
            <Result
                icon={<CrownOutlined />}
                title="JSON Web Token (React/Node.JS) - createdBy @hoidanit"
            />
        </div>
    )
}

export default HomePage;