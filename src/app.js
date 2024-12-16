import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use( express.json() ); 

const alunos = [

    {
        id: 1,
        nome: "Asdrubal",
        ra: "11111",
        nota1: 8.5,
        nota2: 9
    },
    {
        id: 2,
        nome: "Lupita",
        ra: "22222",
        nota1: 7.5,
        nota2: 7
    },
    {
        id: 3,
        nome: "Zoroastro",
        ra: "33333",
        nota1: 3,
        nota2: 4
    },
]

const users = [];

const authenticateJWT = (req, res, next) => {
    const authHeader = req.header('Authorization');
    console.log('Authorization: ' + authHeader);

    let token;

    if (authHeader) {
        const parts = authHeader.split(' ');
        if (parts.length === 2) {
            token = parts[1];
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Acesso negado. Token expirado.' });
            } else if (err.name === 'JsonWebTokenError') {
                return res.status(403).json({ message: 'Acesso negado. Token inválido. '});
            } else {
                return res.status(403).json({ message: 'Acesso negado. Erro na verificação do token.' });
            }
        }

        req.user = user;

        const issuedAtISO = new Date(user.iat * 1000).toISOString();
        const expiresAtISO = new Date(user.exp * 1000).toISOString();

        console.log(`Token validado para usuário: ${user.username}
            Emitido em: ${issuedAtISO}
            Expira em: ${expiresAtISO}
        `);

        next();
    });
};


function buscaAluno(id) {

    return alunos.findIndex( aluno => {
        return aluno.id === Number(id);
    });
}

// Rota cadastro 
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ username, password: hashedPassword });
    console.log(users);

    res.status(201).json({ message: 'Usuário registrado' });
});

// Rota login e token
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const user = users.find(user => user.username === username);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: 'Login Incorreto!' });
    }

    const token = jwt.sign(
        { username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '1h', algorithm: 'HS256' }
    );

    res.json({
        message: `Login efetuado pelo usuário ${user.username}`,
        token: token
    });

    console.log('Login efetuado pelo usuário ' + user.username);
});

// Rota médias alunos
app.get('/alunos/medias', (req, res) => {
    if (alunos.length === 0) {
        return res.status(404).json({ message: "Nenhum aluno cadastrado." });
    }

    const medias = alunos.map(a => ({
        nome: a.nome,
        media: parseFloat(((a.nota1 + a.nota2) / 2).toFixed(2)), 
    }));
    res.status(200).json(medias);
});

// Rota status de aprovação 
app.get('/alunos/aprovados', (req, res) => {
    if (alunos.length === 0) {
        return res.status(404).json({ message: "Nenhum aluno cadastrado." });
    }

    const aprovados = alunos.map(a => ({
        nome: a.nome,
        status: ((a.nota1 + a.nota2) / 2) >= 6 ? 'aprovado' : 'reprovado', // Calcula status com base na média
    }));
    res.status(200).json(aprovados);
});

app.use(authenticateJWT); 

app.get("/alunos", (req, res) => {

    res.status(200).json(alunos);

} );


app.post("/alunos", (req, res) => {
    const { id, nome, ra, nota1, nota2 } = req.body;

    if (!id || !nome || !ra || nota1 === undefined || nota2 === undefined) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios!' });
    }

    if (alunos.some(a => a.id === id)) {
        return res.status(400).json({ message: 'Já existe um aluno com este ID!' });
    }

    alunos.push({ id, nome, ra, nota1, nota2 });
    res.status(201).json({ message: 'Aluno cadastrado com sucesso!' });
} );


// Recuperando um Aluno:

app.get("/alunos/:id", (req, res) => {
    const index = buscaAluno(req.params.id);

    if (index === -1) {
        return res.status(404).json( { message: "Aluno não encontrado" } );
    }
    res.status(200).json(alunos[index]);
});

// Rota mudar dados

app.put("/alunos/:id", (req, res) => {
    const index = buscaAluno(req.params.id);
    if (index === -1) {
        return res.status(404).json({ message: 'Aluno não encontrado!' });
    }
    alunos[index] = { ...alunos[index], ...req.body };
    res.status(200).json( alunos[index] );
});

// Rota apagar dados:

app.delete("/alunos/:id", (req, res) => {
    const index = buscaAluno(req.params.id);
    if (index === -1) {
        return res.status(404).json({ message: 'Aluno não encontrado!' });
    }
    alunos.splice(index, 1);
    res.status(200).json({ message: 'Aluno removido com sucesso!' });
    
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Erro interno do servidor!' });
});


export default app;